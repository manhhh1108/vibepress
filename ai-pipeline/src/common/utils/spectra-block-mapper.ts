import type { WpNode } from './wp-block-to-json.js';

// ── Spectra (UAG) Block Mapper ────────────────────────────────────────────
// Maps Spectra (Ultimate Addons for Gutenberg) blocks to normalized WpNode
// equivalents that downstream mappers already understand, preserving any
// animation / interaction metadata in params._spectraAnimation.

export interface SpectraAnimationConfig {
  /** Animation type on scroll into view */
  entranceAnimation?:
    | 'fadeIn'
    | 'fadeInUp'
    | 'fadeInDown'
    | 'fadeInLeft'
    | 'fadeInRight'
    | 'zoomIn'
    | 'bounceIn'
    | 'slideInUp'
    | 'slideInDown'
    | 'slideInLeft'
    | 'slideInRight';
  /** Animation duration in ms */
  animationDuration?: number;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Hover animation */
  hoverAnimation?: 'grow' | 'shrink' | 'pulse' | 'push' | 'float' | 'shadow';
  /** CSS transition on hover */
  hoverTransition?: string;
}

/**
 * Check if a WpNode is a Spectra block.
 */
export function isSpectraBlock(node: WpNode): boolean {
  return node.block.startsWith('uagb/') || node.block.startsWith('spectra/');
}

/**
 * Map a Spectra WpNode to a normalized WpNode that downstream mappers understand.
 * Returns null if the block is not a recognized Spectra block.
 */
export function mapSpectraBlockToWpNode(node: WpNode): WpNode | null {
  if (!isSpectraBlock(node)) return null;

  const p = node.params ?? {};
  const animation = extractSpectraAnimations(node);
  const animParam = animation ? { _spectraAnimation: animation } : {};

  switch (node.block) {
    // ── Buttons ───────────────────────────────────────────────────────────
    case 'uagb/buttons':
      return {
        block: 'core/buttons',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: (node.children ?? []).map((child) => {
          if (child.block === 'uagb/buttons-child') {
            return {
              block: 'core/button',
              text: child.params?.label ?? child.text,
              href: child.params?.link ?? child.href,
              params: {
                ...child.params,
                ...(child.params?.hoverEffect
                  ? { _spectraAnimation: { hoverAnimation: child.params.hoverEffect } }
                  : {}),
              },
              customClassNames: child.customClassNames,
            };
          }
          return child;
        }),
      };

    case 'uagb/buttons-child':
      return {
        block: 'core/button',
        text: p.label ?? node.text,
        href: p.link ?? node.href,
        params: {
          ...p,
          ...animParam,
          ...(p.hoverEffect
            ? { _spectraAnimation: { hoverAnimation: p.hoverEffect } }
            : {}),
        },
        customClassNames: node.customClassNames,
      };

    // ── Advanced Heading ──────────────────────────────────────────────────
    case 'uagb/advanced-heading': {
      const tag = p.headingTag ?? p.tag ?? 'h2';
      const level = parseInt(String(tag).replace(/\D/g, ''), 10) || 2;
      const heading = p.headingTitle ?? p.headingText ?? node.text ?? '';
      const subHeading = p.subHeading ?? p.subHeadingText;
      const children: WpNode[] = [];
      if (subHeading) {
        children.push({ block: 'core/paragraph', text: subHeading });
      }
      return {
        block: 'core/heading',
        level,
        text: heading,
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        typography: node.typography,
        textAlign: node.textAlign,
        ...(children.length > 0 ? { children } : {}),
      };
    }

    // ── Image Gallery ─────────────────────────────────────────────────────
    case 'uagb/image-gallery':
      return {
        block: 'core/gallery',
        params: { ...p, lightbox: true, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };

    // ── Tabs ──────────────────────────────────────────────────────────────
    case 'uagb/tabs': {
      const tabHeaders: string[] =
        p.tabHeaders ??
        (node.children ?? []).map(
          (c, i) => c.params?.header ?? c.params?.title ?? `Tab ${i + 1}`,
        );
      return {
        block: 'uagb/tabs',
        params: {
          ...p,
          tabHeaders,
          activeTab: p.activeTab ?? 0,
          ...animParam,
        },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    case 'uagb/tabs-child':
      return {
        block: 'uagb/tabs',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };

    // ── Accordion / FAQ ───────────────────────────────────────────────────
    case 'uagb/accordion':
    case 'uagb/faq': {
      const items = (node.children ?? []).map((child) => ({
        question: child.params?.question ?? child.params?.header ?? child.text ?? '',
        answer: child.params?.answer ?? child.params?.content ?? child.html ?? '',
        children: child.children,
      }));
      return {
        block: 'uagb/accordion',
        params: { ...p, items, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Modal ─────────────────────────────────────────────────────────────
    case 'uagb/modal': {
      const showBtn = p.showBtn ?? p.triggerType ?? 'button';
      const btnText = p.btnText ?? p.buttonText ?? 'Open';
      return {
        block: 'uagb/modal',
        params: {
          ...p,
          showBtn,
          btnText,
          ...animParam,
        },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Slider / Image Slider ─────────────────────────────────────────────
    case 'uagb/slider':
    case 'uagb/image-slider': {
      const slides = (node.children ?? []).map((child) => ({
        src: child.src ?? child.params?.url,
        alt: child.alt ?? child.params?.alt,
        text: child.text,
        children: child.children,
      }));
      return {
        block: 'uagb/slider',
        params: {
          ...p,
          slides,
          autoplay: p.autoplay ?? false,
          loop: p.loop ?? p.infiniteLoop ?? false,
          pauseOnHover: p.pauseOnHover ?? true,
          autoplaySpeed: p.autoplaySpeed ?? 3000,
          ...animParam,
        },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Counter ───────────────────────────────────────────────────────────
    case 'uagb/counter':
      return {
        block: 'uagb/counter',
        params: {
          ...p,
          starting: p.starting ?? p.startNumber ?? 0,
          ending: p.ending ?? p.endNumber ?? 100,
          prefix: p.prefix ?? '',
          suffix: p.suffix ?? '',
          animationDuration: p.animationDuration ?? p.duration ?? 2000,
          ...animParam,
        },
        customClassNames: node.customClassNames,
        text: node.text,
      };

    // ── Info Box ──────────────────────────────────────────────────────────
    case 'uagb/info-box': {
      const children: WpNode[] = [];
      if (p.iconImage === 'image' && p.iconimgUrl) {
        children.push({
          block: 'core/image',
          src: p.iconimgUrl,
          alt: p.iconimgAlt ?? '',
        });
      }
      if (p.infoBoxTitle ?? p.headingTitle) {
        children.push({
          block: 'core/heading',
          level: 3,
          text: p.infoBoxTitle ?? p.headingTitle,
        });
      }
      if (p.headingDesc ?? p.description) {
        children.push({
          block: 'core/paragraph',
          text: p.headingDesc ?? p.description,
        });
      }
      if (p.ctaText && p.ctaLink) {
        children.push({
          block: 'core/button',
          text: p.ctaText,
          href: p.ctaLink,
        });
      }
      return {
        block: 'core/group',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: children.length > 0 ? children : node.children,
      };
    }

    // ── Icon List ─────────────────────────────────────────────────────────
    case 'uagb/icon-list':
    case 'uagb/icon-list-child': {
      const iconItems = (node.children ?? []).map((child) => ({
        icon: child.params?.icon ?? child.params?.image,
        label: child.params?.label ?? child.text,
        link: child.params?.link ?? child.href,
      }));
      return {
        block: 'core/list',
        params: { ...p, iconItems, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Content Timeline ──────────────────────────────────────────────────
    case 'uagb/content-timeline':
    case 'uagb/content-timeline-child': {
      const timelineItems = (node.children ?? []).map((child) => ({
        date: child.params?.t_date ?? child.params?.date,
        heading: child.params?.t_heading ?? child.params?.heading ?? child.text,
        content: child.params?.t_content ?? child.params?.content ?? child.html,
      }));
      return {
        block: 'core/group',
        params: { ...p, timelineItems, layout: 'timeline', ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Post Grid / Carousel / Masonry ────────────────────────────────────
    case 'uagb/post-grid':
    case 'uagb/post-carousel':
    case 'uagb/post-masonry': {
      const layoutHint = node.block === 'uagb/post-carousel'
        ? 'carousel'
        : node.block === 'uagb/post-masonry'
          ? 'masonry'
          : 'grid';
      return {
        block: 'core/query',
        params: {
          ...p,
          layoutHint,
          postsToShow: p.postsToShow ?? p.postNumber ?? 6,
          postType: p.postType ?? 'post',
          columns: p.columns ?? 3,
          ...animParam,
        },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Section / Columns ─────────────────────────────────────────────────
    case 'uagb/section':
      return {
        block: 'core/group',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
        bgColor: node.bgColor,
        textColor: node.textColor,
        padding: node.padding,
        margin: node.margin,
      };

    case 'uagb/columns':
      return {
        block: 'core/columns',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
        bgColor: node.bgColor,
        textColor: node.textColor,
      };

    // ── Container ─────────────────────────────────────────────────────────
    case 'uagb/container':
      return {
        block: 'core/group',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
        bgColor: node.bgColor,
        textColor: node.textColor,
        padding: node.padding,
        margin: node.margin,
        gap: node.gap,
      };

    // ── Separator ─────────────────────────────────────────────────────────
    case 'uagb/separator':
      return {
        block: 'core/separator',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
      };

    // ── Testimonials ──────────────────────────────────────────────────────
    case 'uagb/testimonials': {
      const testimonials = (node.children ?? []).map((child) => ({
        name: child.params?.authorName ?? child.params?.name,
        company: child.params?.company ?? child.params?.designation,
        description: child.params?.description ?? child.text,
        image: child.params?.authorImage ?? child.params?.image,
      }));
      return {
        block: 'core/quote',
        params: { ...p, testimonials, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Team ──────────────────────────────────────────────────────────────
    case 'uagb/team': {
      const memberData = {
        name: p.title ?? p.name,
        designation: p.designation ?? p.role,
        description: p.description ?? node.text,
        image: p.image ?? p.imgURL,
        socialLinks: p.socialEnable
          ? {
              twitter: p.twitterIcon ?? p.twitter,
              facebook: p.facebookIcon ?? p.facebook,
              linkedin: p.linkedinIcon ?? p.linkedin,
              instagram: p.instagramIcon ?? p.instagram,
            }
          : undefined,
      };
      return {
        block: 'core/group',
        params: { ...p, teamMember: memberData, ...animParam },
        customClassNames: node.customClassNames,
        children: node.children,
      };
    }

    // ── Social Share ──────────────────────────────────────────────────────
    case 'uagb/social-share':
      return {
        block: 'core/social-links',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: (node.children ?? []).map((child) => ({
          block: 'core/social-link',
          params: {
            service: child.params?.type ?? child.params?.service ?? 'share',
            url: child.params?.url ?? child.href,
          },
        })),
      };

    // ── Call to Action ────────────────────────────────────────────────────
    case 'uagb/call-to-action': {
      const children: WpNode[] = [];
      if (p.ctaTitle ?? p.heading) {
        children.push({
          block: 'core/heading',
          level: 2,
          text: p.ctaTitle ?? p.heading,
        });
      }
      if (p.description ?? p.ctaDescription) {
        children.push({
          block: 'core/paragraph',
          text: p.description ?? p.ctaDescription,
        });
      }
      if (p.ctaText ?? p.buttonText) {
        children.push({
          block: 'core/button',
          text: p.ctaText ?? p.buttonText,
          href: p.ctaLink ?? p.buttonUrl ?? '#',
        });
      }
      return {
        block: 'core/group',
        params: { ...p, ...animParam },
        customClassNames: node.customClassNames,
        children: children.length > 0 ? children : node.children,
        bgColor: node.bgColor,
        textColor: node.textColor,
      };
    }

    // ── Marketing Button ──────────────────────────────────────────────────
    case 'uagb/marketing-button':
      return {
        block: 'core/button',
        text: p.heading ?? p.title ?? node.text,
        href: p.link ?? p.url ?? node.href,
        params: {
          ...p,
          ...animParam,
          _spectraAnimation: {
            ...(animation ?? {}),
            hoverAnimation: p.hoverEffect ?? animation?.hoverAnimation,
          },
        },
        customClassNames: node.customClassNames,
      };

    default:
      return null;
  }
}

/**
 * Extract animation/interaction metadata from Spectra block attributes.
 * Returns null when the block has no animation configuration.
 */
export function extractSpectraAnimations(node: WpNode): SpectraAnimationConfig | null {
  const p = node.params ?? {};

  // Spectra stores animation config in various param shapes
  const uagAnimationType =
    p.UAGAnimationType ??
    p.uagAnimationType ??
    p.animationType ??
    p.animation;

  const uagAnimationDuration =
    p.UAGAnimationDuration ??
    p.uagAnimationDuration ??
    p.animationDuration ??
    p.duration;

  const uagAnimationDelay =
    p.UAGAnimationDelay ??
    p.uagAnimationDelay ??
    p.animationDelay ??
    p.delay;

  const hoverAnimation =
    p.UAGHoverAnimation ??
    p.uagHoverAnimation ??
    p.hoverAnimation ??
    p.hoverEffect;

  const hoverTransition = p.hoverTransition ?? p.transitionDuration;

  // Map Spectra animation type strings to our enum values
  const animationMap: Record<string, SpectraAnimationConfig['entranceAnimation']> = {
    'fadeIn': 'fadeIn',
    'fade-in': 'fadeIn',
    'fadeInUp': 'fadeInUp',
    'fade-in-up': 'fadeInUp',
    'fadeInDown': 'fadeInDown',
    'fade-in-down': 'fadeInDown',
    'fadeInLeft': 'fadeInLeft',
    'fade-in-left': 'fadeInLeft',
    'fadeInRight': 'fadeInRight',
    'fade-in-right': 'fadeInRight',
    'zoomIn': 'zoomIn',
    'zoom-in': 'zoomIn',
    'bounceIn': 'bounceIn',
    'bounce-in': 'bounceIn',
    'slideInUp': 'slideInUp',
    'slide-in-up': 'slideInUp',
    'slideInDown': 'slideInDown',
    'slide-in-down': 'slideInDown',
    'slideInLeft': 'slideInLeft',
    'slide-in-left': 'slideInLeft',
    'slideInRight': 'slideInRight',
    'slide-in-right': 'slideInRight',
  };

  const hoverMap: Record<string, SpectraAnimationConfig['hoverAnimation']> = {
    'grow': 'grow',
    'shrink': 'shrink',
    'pulse': 'pulse',
    'push': 'push',
    'float': 'float',
    'shadow': 'shadow',
  };

  const entranceAnimation = uagAnimationType
    ? animationMap[String(uagAnimationType)] ?? undefined
    : undefined;

  const mappedHover = hoverAnimation
    ? hoverMap[String(hoverAnimation)] ?? undefined
    : undefined;

  const config: SpectraAnimationConfig = {};

  if (entranceAnimation) config.entranceAnimation = entranceAnimation;
  if (uagAnimationDuration) config.animationDuration = Number(uagAnimationDuration);
  if (uagAnimationDelay) config.animationDelay = Number(uagAnimationDelay);
  if (mappedHover) config.hoverAnimation = mappedHover;
  if (hoverTransition) config.hoverTransition = String(hoverTransition);

  return Object.keys(config).length > 0 ? config : null;
}
