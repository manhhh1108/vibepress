/**
 * Converts an Elementor JSON element tree into the WpNode[] format used by the
 * rest of the ai-pipeline.  This bridges Elementor's proprietary
 * section → column → widget hierarchy into the same block-based representation
 * that the Gutenberg block parser produces.
 */

import type { WpNode } from './wp-block-to-json.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ElementorElement {
  id: string;
  elType: 'section' | 'column' | 'widget' | 'container';
  widgetType?: string;
  settings: Record<string, any>;
  elements?: ElementorElement[];
}

export interface ElementorSpacing {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  unit?: string;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Convert an array of top-level Elementor elements into WpNode[].
 */
export function elementorElementsToWpNodes(
  elements: ElementorElement[],
): WpNode[] {
  if (!Array.isArray(elements)) return [];
  return elements.map(convertElement).filter(Boolean) as WpNode[];
}

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

function convertElement(el: ElementorElement): WpNode | null {
  if (!el || typeof el !== 'object') return null;

  switch (el.elType) {
    case 'section':
      return convertSection(el);
    case 'column':
      return convertColumn(el);
    case 'container':
      return convertContainer(el);
    case 'widget':
      return convertWidget(el);
    default:
      return null;
  }
}

function convertSection(el: ElementorElement): WpNode {
  const s = el.settings ?? {};
  const children = convertChildren(el.elements);

  const layout = s.layout as string | undefined; // full_width | boxed | ...
  const align = layout === 'full_width' ? 'full' : undefined;

  return compact({
    block: 'core/group',
    align,
    ...extractCommonStyles(s),
    ...extractBackground(s),
    params: {
      elementorId: el.id,
      elementorType: 'section',
      ...(layout ? { layout } : {}),
      ...extractResponsiveParams(s),
    },
    children: children.length > 0 ? children : undefined,
  });
}

function convertColumn(el: ElementorElement): WpNode {
  const s = el.settings ?? {};
  const children = convertChildren(el.elements);

  const columnSize = s._column_size as number | undefined;
  const columnWidth = columnSize ? `${columnSize}%` : undefined;

  return compact({
    block: 'core/column',
    columnWidth,
    ...extractCommonStyles(s),
    ...extractBackground(s),
    params: {
      elementorId: el.id,
      elementorType: 'column',
      ...extractResponsiveParams(s),
    },
    children: children.length > 0 ? children : undefined,
  });
}

function convertContainer(el: ElementorElement): WpNode {
  const s = el.settings ?? {};
  const children = convertChildren(el.elements);

  const contentWidth = s.content_width as string | undefined; // full | boxed
  const align = contentWidth === 'full' ? 'full' : undefined;

  return compact({
    block: 'core/group',
    align,
    ...extractCommonStyles(s),
    ...extractBackground(s),
    params: {
      elementorId: el.id,
      elementorType: 'container',
      ...(s.flex_direction ? { flexDirection: s.flex_direction } : {}),
      ...(s.flex_wrap ? { flexWrap: s.flex_wrap } : {}),
      ...(s.justify_content ? { justifyContent: s.justify_content } : {}),
      ...(s.align_items ? { alignItems: s.align_items } : {}),
      ...extractResponsiveParams(s),
    },
    children: children.length > 0 ? children : undefined,
  });
}

// ---------------------------------------------------------------------------
// Widget conversion
// ---------------------------------------------------------------------------

function convertWidget(el: ElementorElement): WpNode | null {
  const wt = el.widgetType ?? '';
  const s = el.settings ?? {};

  const converter = WIDGET_MAP[wt];
  if (converter) {
    const node = converter(s, el);
    return compact({
      ...node,
      ...extractCommonStyles(s),
      params: {
        ...(node.params ?? {}),
        elementorId: el.id,
        elementorWidget: wt,
        ...extractResponsiveParams(s),
      },
    });
  }

  // Fallback: unknown widget → core/html
  return compact({
    block: 'core/html',
    ...extractCommonStyles(s),
    params: {
      elementorId: el.id,
      elementorWidget: wt,
      ...extractResponsiveParams(s),
    },
  });
}

// ---------------------------------------------------------------------------
// Widget-type mapping table
// ---------------------------------------------------------------------------

type WidgetConverter = (
  s: Record<string, any>,
  el: ElementorElement,
) => WpNode;

const WIDGET_MAP: Record<string, WidgetConverter> = {
  heading: (s) => ({
    block: 'core/heading',
    text: String(s.title ?? ''),
    level: parseHeadingLevel(s.size ?? s.header_size),
    textAlign: s.align as string | undefined,
  }),

  'text-editor': (s) => ({
    block: 'core/paragraph',
    html: String(s.editor ?? ''),
  }),

  image: (s) => {
    const img = s.image ?? {};
    return {
      block: 'core/image',
      src: String(img.url ?? ''),
      alt: String(img.alt ?? s.alt ?? ''),
      ...(img.width ? { width: Number(img.width) } : {}),
      ...(img.height ? { height: Number(img.height) } : {}),
    };
  },

  button: (s) => ({
    block: 'core/button',
    text: String(s.text ?? ''),
    href: s.link?.url ? String(s.link.url) : undefined,
    params: {
      ...(s.size ? { size: s.size } : {}),
    },
  }),

  icon: (s) => ({
    block: 'core/html',
    params: {
      icon: s.selected_icon?.value ?? s.icon ?? '',
    },
  }),

  spacer: (s) => {
    const space = s.space;
    const height =
      space && typeof space === 'object'
        ? `${space.size ?? 50}${space.unit ?? 'px'}`
        : typeof space === 'number'
          ? `${space}px`
          : '50px';
    return {
      block: 'core/spacer',
      params: { height },
    };
  },

  'image-box': (s) => {
    const img = s.image ?? {};
    return {
      block: 'core/group',
      children: [
        compact({
          block: 'core/image',
          src: String(img.url ?? ''),
          alt: String(img.alt ?? ''),
        }),
        compact({
          block: 'core/heading',
          text: String(s.title_text ?? ''),
          level: 3,
        }),
        compact({
          block: 'core/paragraph',
          html: String(s.description_text ?? ''),
        }),
      ],
    };
  },

  'icon-box': (s) => ({
    block: 'core/group',
    children: [
      compact({
        block: 'core/heading',
        text: String(s.title_text ?? ''),
        level: 3,
      }),
      compact({
        block: 'core/paragraph',
        html: String(s.description_text ?? ''),
      }),
    ],
    params: {
      icon: s.selected_icon?.value ?? s.icon ?? '',
    },
  }),

  'star-rating': (s) => ({
    block: 'core/html',
    params: {
      rating: s.rating ?? 5,
      starCount: s.star_count ?? 5,
    },
  }),

  counter: (s) => ({
    block: 'core/group',
    children: [
      compact({
        block: 'core/paragraph',
        text: String(s.ending_number ?? s.starting_number ?? '0'),
      }),
      compact({
        block: 'core/heading',
        text: String(s.title ?? ''),
        level: 3,
      }),
    ],
    params: {
      startingNumber: s.starting_number ?? 0,
      endingNumber: s.ending_number ?? 100,
      prefix: s.prefix ?? '',
      suffix: s.suffix ?? '',
    },
  }),

  progress: (s) => ({
    block: 'core/group',
    children: [
      compact({
        block: 'core/paragraph',
        text: String(s.title ?? ''),
      }),
    ],
    params: {
      percentage: s.percent ?? 0,
      progressType: s.progress_type ?? 'default',
    },
  }),

  tabs: (s) => ({
    block: 'uagb/tabs',
    params: {
      tabs: Array.isArray(s.tabs)
        ? s.tabs.map((tab: any) => ({
            title: String(tab.tab_title ?? ''),
            content: String(tab.tab_content ?? ''),
          }))
        : [],
    },
  }),

  accordion: (s) => ({
    block: 'uagb/accordion',
    params: {
      items: Array.isArray(s.tabs)
        ? s.tabs.map((tab: any) => ({
            title: String(tab.tab_title ?? ''),
            content: String(tab.tab_content ?? ''),
          }))
        : [],
    },
  }),

  toggle: (s) => ({
    block: 'uagb/accordion',
    params: {
      items: Array.isArray(s.tabs)
        ? s.tabs.map((tab: any) => ({
            title: String(tab.tab_title ?? ''),
            content: String(tab.tab_content ?? ''),
          }))
        : [],
    },
  }),

  'social-icons': (s) => ({
    block: 'core/social-links',
    params: {
      icons: Array.isArray(s.social_icon_list)
        ? s.social_icon_list.map((icon: any) => ({
            network: String(icon.social_icon?.value ?? icon.social ?? ''),
            url: String(icon.link?.url ?? ''),
          }))
        : [],
    },
  }),

  form: (s) => ({
    block: 'core/html',
    params: {
      formName: s.form_name ?? '',
      fields: Array.isArray(s.form_fields)
        ? s.form_fields.map((field: any) => ({
            type: String(field.field_type ?? 'text'),
            label: String(field.field_label ?? ''),
            placeholder: String(field.placeholder ?? ''),
            required: field.required === 'true' || field.required === true,
          }))
        : [],
      submitText: s.button_text ?? 'Submit',
    },
  }),

  slides: (s) => ({
    block: 'uagb/slider',
    params: {
      slides: Array.isArray(s.slides)
        ? s.slides.map((slide: any) => ({
            heading: String(slide.heading ?? ''),
            description: String(slide.description ?? ''),
            backgroundImage: slide.background_image?.url ?? '',
            buttonText: String(slide.button_text ?? ''),
            buttonLink: slide.link?.url ?? '',
          }))
        : [],
    },
  }),

  carousel: convertCarousel,
  'image-carousel': convertCarousel,

  testimonial: (s) => ({
    block: 'core/quote',
    text: String(s.testimonial_content ?? ''),
    params: {
      cite: String(s.testimonial_name ?? ''),
      job: String(s.testimonial_job ?? ''),
      image: s.testimonial_image?.url ?? '',
    },
  }),

  video: (s) => ({
    block: 'core/video',
    src: String(s.youtube_url ?? s.vimeo_url ?? s.hosted_url?.url ?? ''),
    params: {
      videoType: s.video_type ?? 'youtube',
    },
  }),

  divider: () => ({
    block: 'core/separator',
  }),

  google_maps: (s) => ({
    block: 'core/html',
    params: {
      mapAddress: s.address ?? '',
      mapZoom: s.zoom?.size ?? 10,
    },
  }),

  map: (s) => ({
    block: 'core/html',
    params: {
      mapAddress: s.address ?? '',
      mapZoom: s.zoom?.size ?? 10,
    },
  }),
};

function convertCarousel(s: Record<string, any>): WpNode {
  return {
    block: 'uagb/slider',
    params: {
      slides: Array.isArray(s.carousel)
        ? s.carousel.map((item: any) => ({
            src: String(item.url ?? ''),
            alt: String(item.alt ?? ''),
          }))
        : [],
    },
  };
}

// ---------------------------------------------------------------------------
// Style extraction helpers
// ---------------------------------------------------------------------------

function extractCommonStyles(s: Record<string, any>): Partial<WpNode> {
  const result: Partial<WpNode> = {};

  // Colors
  if (s.color) result.textColor = String(s.color);
  if (s.text_color) result.textColor = String(s.text_color);
  if (s.background_color) result.bgColor = String(s.background_color);

  // Typography
  const typo = extractTypography(s);
  if (typo && Object.keys(typo).length > 0) result.typography = typo;

  // Spacing
  const padding = normalizeElementorSpacing(s.padding);
  if (padding) result.padding = padding;
  const margin = normalizeElementorSpacing(s.margin);
  if (margin) result.margin = margin;

  // Border radius
  const borderRadius = extractBorderRadius(s);
  if (borderRadius) result.borderRadius = borderRadius;

  // Text alignment
  if (s.align) result.textAlign = String(s.align);

  return result;
}

function extractBackground(s: Record<string, any>): Partial<WpNode> {
  const result: Partial<WpNode> = {};

  const bgType = s.background_background; // 'classic' | 'gradient' | undefined
  if (bgType === 'classic') {
    if (s.background_image?.url) {
      result.src = String(s.background_image.url);
    }
    if (s.background_color) {
      result.bgColor = String(s.background_color);
    }
  } else if (bgType === 'gradient') {
    if (s.background_color) {
      result.bgColor = String(s.background_color);
    }
  }

  return result;
}

function extractTypography(
  s: Record<string, any>,
): WpNode['typography'] | undefined {
  const t: NonNullable<WpNode['typography']> = {};

  if (s.typography_font_family) t.fontFamily = String(s.typography_font_family);
  if (s.typography_font_weight) t.fontWeight = String(s.typography_font_weight);
  if (s.typography_text_transform)
    t.textTransform = String(s.typography_text_transform);

  const fontSize = normalizeElementorSize(s.typography_font_size);
  if (fontSize) t.fontSize = fontSize;
  const lineHeight = normalizeElementorSize(s.typography_line_height);
  if (lineHeight) t.lineHeight = lineHeight;
  const letterSpacing = normalizeElementorSize(s.typography_letter_spacing);
  if (letterSpacing) t.letterSpacing = letterSpacing;

  return Object.keys(t).length > 0 ? t : undefined;
}

function extractBorderRadius(s: Record<string, any>): string | undefined {
  const br = s.border_radius;
  if (!br) return undefined;

  if (typeof br === 'object') {
    const unit = br.unit ?? 'px';
    const parts = [br.top, br.right, br.bottom, br.left]
      .map((v) =>
        v !== undefined && v !== '' ? `${v}${unit}` : undefined,
      )
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  return typeof br === 'string' && br.trim() ? br.trim() : undefined;
}

// ---------------------------------------------------------------------------
// Responsive params
// ---------------------------------------------------------------------------

function extractResponsiveParams(
  s: Record<string, any>,
): Record<string, any> | undefined {
  const responsive: Record<string, any> = {};

  // Collect tablet/mobile overrides for key layout properties
  const responsiveKeys = [
    'padding',
    'margin',
    'width',
    '_column_size',
    'align',
    'typography_font_size',
  ];

  for (const key of responsiveKeys) {
    if (s[`${key}_tablet`] !== undefined) {
      responsive[`${key}_tablet`] = s[`${key}_tablet`];
    }
    if (s[`${key}_mobile`] !== undefined) {
      responsive[`${key}_mobile`] = s[`${key}_mobile`];
    }
  }

  // Hide on device flags
  if (s.hide_desktop === 'yes') responsive.hideDesktop = true;
  if (s.hide_tablet === 'yes') responsive.hideTablet = true;
  if (s.hide_mobile === 'yes') responsive.hideMobile = true;

  return Object.keys(responsive).length > 0 ? responsive : undefined;
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function normalizeElementorSpacing(
  value: unknown,
): WpNode['padding'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const sp = value as ElementorSpacing;
  const unit = sp.unit ?? 'px';

  const result: NonNullable<WpNode['padding']> = {};
  if (sp.top !== undefined && sp.top !== '') result.top = `${sp.top}${unit}`;
  if (sp.right !== undefined && sp.right !== '')
    result.right = `${sp.right}${unit}`;
  if (sp.bottom !== undefined && sp.bottom !== '')
    result.bottom = `${sp.bottom}${unit}`;
  if (sp.left !== undefined && sp.left !== '') result.left = `${sp.left}${unit}`;

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeElementorSize(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;

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
  return /^\d+(\.\d+)?$/.test(str) ? `${str}px` : str;
}

function parseHeadingLevel(size: unknown): number {
  if (typeof size === 'number') return Math.min(6, Math.max(1, size));
  const str = String(size ?? 'h2').toLowerCase().replace(/^h/, '');
  const num = parseInt(str, 10);
  return isNaN(num) ? 2 : Math.min(6, Math.max(1, num));
}

function convertChildren(elements?: ElementorElement[]): WpNode[] {
  if (!Array.isArray(elements)) return [];
  return elements.map(convertElement).filter(Boolean) as WpNode[];
}

/** Remove undefined / empty fields to keep the JSON compact. */
function compact(node: WpNode): WpNode {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      key === 'params' &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
      continue;
    cleaned[key] = value;
  }
  return cleaned as WpNode;
}
