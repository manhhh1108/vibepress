import { Injectable, Logger } from '@nestjs/common';
import { WpQueryService } from '../../sql/wp-query.service.js';
import { SqlService } from '../../sql/sql.service.js';
import {
  type ElementorElement,
  elementorElementsToWpNodes,
} from '../../../common/utils/elementor-to-json.js';
import {
  type ElementorGlobalTokens,
  extractElementorGlobalTokens,
} from '../../../common/utils/elementor-globals.js';
import type { WpNode } from '../../../common/utils/wp-block-to-json.js';
import { createConnection } from 'mysql2/promise';
import { parseDbConnectionString } from '../../../common/utils/db-connection-parser.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ElementorParsedPage {
  postId: number;
  postTitle: string;
  postType: string;
  slug: string;
  wpNodes: WpNode[];
}

export interface ElementorParseResult {
  pages: ElementorParsedPage[];
  globalTokens: ElementorGlobalTokens;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ElementorParserService {
  private readonly logger = new Logger(ElementorParserService.name);

  constructor(
    private readonly wpQueryService: WpQueryService,
    private readonly sqlService: SqlService,
  ) {}

  /**
   * Extract all Elementor-managed pages from the WordPress database and convert
   * each page's element tree into the WpNode[] format consumed by the rest of
   * the pipeline.
   */
  async parseElementorPages(
    connectionString: string,
  ): Promise<ElementorParseResult> {
    const conn = await this.openConnection(connectionString);
    try {
      const prefix = await this.detectTablePrefix(conn);

      // 1. Fetch Elementor page data
      const pages = await this.fetchElementorPages(conn, prefix);
      this.logger.log(
        `Found ${pages.length} Elementor page(s) in the database`,
      );

      // 2. Fetch global tokens from the active kit
      const globalTokens = await this.fetchGlobalTokens(conn, prefix);

      return { pages, globalTokens };
    } finally {
      await conn.end();
    }
  }

  // -------------------------------------------------------------------------
  // Elementor page data
  // -------------------------------------------------------------------------

  private async fetchElementorPages(
    conn: Awaited<ReturnType<typeof createConnection>>,
    prefix: string,
  ): Promise<ElementorParsedPage[]> {
    const [rows] = await conn.query<any[]>(
      `SELECT p.ID, p.post_title, p.post_type, p.post_name, pm.meta_value
       FROM \`${prefix}posts\` p
       INNER JOIN \`${prefix}postmeta\` pm
         ON pm.post_id = p.ID AND pm.meta_key = '_elementor_data'
       WHERE p.post_status IN ('publish', 'private')
       ORDER BY p.post_type, p.menu_order, p.ID`,
    );

    const pages: ElementorParsedPage[] = [];

    for (const row of rows) {
      const postId = Number(row.ID);
      const rawJson = String(row.meta_value ?? '');
      if (!rawJson.trim()) {
        this.logger.warn(
          `Post ${postId} has empty _elementor_data — skipping`,
        );
        continue;
      }

      let elements: ElementorElement[];
      try {
        elements = JSON.parse(rawJson);
      } catch (err) {
        this.logger.warn(
          `Post ${postId} has malformed _elementor_data JSON — skipping: ${
            (err as Error).message
          }`,
        );
        continue;
      }

      if (!Array.isArray(elements)) {
        this.logger.warn(
          `Post ${postId} _elementor_data is not an array — skipping`,
        );
        continue;
      }

      const wpNodes = elementorElementsToWpNodes(elements);

      pages.push({
        postId,
        postTitle: String(row.post_title ?? ''),
        postType: String(row.post_type ?? 'page'),
        slug: String(row.post_name ?? ''),
        wpNodes,
      });
    }

    return pages;
  }

  // -------------------------------------------------------------------------
  // Global tokens (active kit)
  // -------------------------------------------------------------------------

  private async fetchGlobalTokens(
    conn: Awaited<ReturnType<typeof createConnection>>,
    prefix: string,
  ): Promise<ElementorGlobalTokens> {
    // The active kit post ID is stored in the option `elementor_active_kit`.
    const [[kitIdRow]] = await conn.query<any[]>(
      `SELECT option_value FROM \`${prefix}options\`
       WHERE option_name = 'elementor_active_kit' LIMIT 1`,
    );

    if (!kitIdRow?.option_value) {
      this.logger.warn('No elementor_active_kit option found — using defaults');
      return { colors: [], fonts: [] };
    }

    const kitPostId = Number(kitIdRow.option_value);

    // Kit settings are stored in _elementor_page_settings postmeta.
    const [[settingsRow]] = await conn.query<any[]>(
      `SELECT meta_value FROM \`${prefix}postmeta\`
       WHERE post_id = ? AND meta_key = '_elementor_page_settings' LIMIT 1`,
      [kitPostId],
    );

    if (!settingsRow?.meta_value) {
      this.logger.warn(
        `Active kit post ${kitPostId} has no _elementor_page_settings — using defaults`,
      );
      return { colors: [], fonts: [] };
    }

    let kitSettings: Record<string, any>;
    try {
      kitSettings = this.parseKitSettings(String(settingsRow.meta_value));
    } catch (err) {
      this.logger.warn(
        `Failed to parse kit settings for post ${kitPostId}: ${
          (err as Error).message
        }`,
      );
      return { colors: [], fonts: [] };
    }

    const tokens = extractElementorGlobalTokens(kitSettings);
    this.logger.log(
      `Extracted global tokens: ${tokens.colors.length} color(s), ${tokens.fonts.length} font(s)`,
    );

    return tokens;
  }

  /**
   * Kit settings can be stored as either JSON or a PHP-serialised string.
   * WordPress typically serialises arrays, but Elementor sometimes stores JSON.
   * Try JSON first, then fall back to a basic PHP unserialize regex approach.
   */
  private parseKitSettings(raw: string): Record<string, any> {
    const trimmed = raw.trim();

    // Try JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    // PHP serialised — extract string values via regex as a best-effort
    // approach.  A full PHP unserialiser is out of scope; the most critical
    // tokens (system_colors, system_typography) are often stored as JSON
    // inside an Elementor option instead.
    throw new Error(
      'PHP-serialised kit settings detected — JSON expected. ' +
        'Consider querying _elementor_data of the kit post instead.',
    );
  }

  // -------------------------------------------------------------------------
  // DB helpers
  // -------------------------------------------------------------------------

  private async openConnection(connectionString: string) {
    const creds = parseDbConnectionString(connectionString);
    return createConnection({
      host: creds.host,
      port: creds.port,
      user: creds.user,
      password: creds.password,
      database: creds.database,
    });
  }

  private async detectTablePrefix(
    conn: Awaited<ReturnType<typeof createConnection>>,
  ): Promise<string> {
    const [rows] = await conn.query<any[]>(
      `SELECT table_name AS tableName FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name LIKE '%options' LIMIT 1`,
    );
    if (!rows.length) return 'wp_';
    const tableName: string = rows[0].tableName;
    return tableName.replace(/options$/, '');
  }
}
