/**
 * Extracts Elementor global design tokens from the active kit settings.
 *
 * Elementor stores site-wide design tokens (global colors, fonts, container width,
 * widget spacing, etc.) in the "active kit" post — a special `elementor_library`
 * post whose ID is stored in the `elementor_active_kit` option. The kit's settings
 * live in `_elementor_page_settings` postmeta as a serialized PHP array.
 */

export interface ElementorGlobalTokens {
  colors: { id: string; title: string; color: string }[];
  fonts: { id: string; title: string; family: string; weight?: string }[];
  containerWidth?: string;
  spaceBetweenWidgets?: string;
  stretchedSectionWidth?: string;
  pageBackground?: string;
}

/**
 * Parse Elementor active-kit settings into a normalised global-tokens object.
 *
 * @param kitSettings - The decoded `_elementor_page_settings` value for the
 *   active kit post (already JSON-parsed).
 */
export function extractElementorGlobalTokens(
  kitSettings: Record<string, any>,
): ElementorGlobalTokens {
  const colors = parseGlobalColors(kitSettings.system_colors);
  const fonts = parseGlobalFonts(kitSettings.system_typography);

  const containerWidth = normalizeLength(kitSettings.container_width);
  const spaceBetweenWidgets = normalizeLength(
    kitSettings.space_between_widgets,
  );
  const stretchedSectionWidth =
    typeof kitSettings.stretched_section_container === 'string'
      ? kitSettings.stretched_section_container || undefined
      : undefined;

  const pageBackground = resolveBackground(
    kitSettings.body_background_background,
    kitSettings.body_background_color,
  );

  return {
    colors,
    fonts,
    ...(containerWidth ? { containerWidth } : {}),
    ...(spaceBetweenWidgets ? { spaceBetweenWidgets } : {}),
    ...(stretchedSectionWidth ? { stretchedSectionWidth } : {}),
    ...(pageBackground ? { pageBackground } : {}),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseGlobalColors(
  raw: unknown,
): ElementorGlobalTokens['colors'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry._id === 'string' &&
        typeof entry.color === 'string' &&
        entry.color.trim() !== '',
    )
    .map((entry) => ({
      id: String(entry._id),
      title: String(entry.title ?? entry._id),
      color: String(entry.color),
    }));
}

function parseGlobalFonts(
  raw: unknown,
): ElementorGlobalTokens['fonts'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry._id === 'string' &&
        entry.typography_font_family,
    )
    .map((entry) => ({
      id: String(entry._id),
      title: String(entry.title ?? entry._id),
      family: String(entry.typography_font_family),
      ...(entry.typography_font_weight
        ? { weight: String(entry.typography_font_weight) }
        : {}),
    }));
}

function normalizeLength(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  // Elementor may store { size: 1140, unit: 'px' } or a plain number/string.
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.size !== undefined && obj.size !== '') {
      const unit = typeof obj.unit === 'string' ? obj.unit : 'px';
      return `${obj.size}${unit}`;
    }
    return undefined;
  }

  const str = String(value).trim();
  if (!str) return undefined;
  // Append px if the value is purely numeric
  return /^\d+(\.\d+)?$/.test(str) ? `${str}px` : str;
}

function resolveBackground(
  type: unknown,
  color: unknown,
): string | undefined {
  if (!color || typeof color !== 'string' || !color.trim()) return undefined;
  // Only handle 'classic' background type (solid color). Gradient backgrounds
  // are more complex and rarely used as a global page background.
  if (type !== undefined && type !== 'classic') return undefined;
  return color.trim();
}
