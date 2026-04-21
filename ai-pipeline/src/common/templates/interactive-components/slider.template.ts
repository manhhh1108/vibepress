/**
 * Returns a complete React slider/carousel component as a TSX source string.
 * Uses Swiper.js with Navigation, Pagination, and Autoplay modules.
 */
export function getSliderTemplate(): string {
  return `'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export interface Slide {
  /** Image source URL (optional if using children). */
  src?: string;
  /** Alt text for the image. */
  alt?: string;
  /** Optional text overlay or caption. */
  text?: string;
  /** Optional HTML content for the slide. */
  html?: string;
}

export interface SliderProps {
  slides: Slide[];
  /** Enable autoplay (default: false). */
  autoplay?: boolean;
  /** Autoplay delay in ms (default: 3000). */
  autoplaySpeed?: number;
  /** Pause autoplay on hover (default: true). */
  pauseOnHover?: boolean;
  /** Enable infinite loop (default: false). */
  loop?: boolean;
  /** Show navigation arrows (default: true). */
  showNavigation?: boolean;
  /** Show pagination dots (default: true). */
  showPagination?: boolean;
  /** Slides per view (default: 1). */
  slidesPerView?: number;
  /** Space between slides in px (default: 0). */
  spaceBetween?: number;
  className?: string;
}

export default function Slider({
  slides,
  autoplay: autoplayEnabled = false,
  autoplaySpeed = 3000,
  pauseOnHover = true,
  loop = false,
  showNavigation = true,
  showPagination = true,
  slidesPerView = 1,
  spaceBetween = 0,
  className = '',
}: SliderProps) {
  if (slides.length === 0) return null;

  return (
    <div className={\`slider \${className}\`.trim()}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation={showNavigation}
        pagination={showPagination ? { clickable: true } : false}
        autoplay={
          autoplayEnabled
            ? { delay: autoplaySpeed, disableOnInteraction: false, pauseOnMouseEnter: pauseOnHover }
            : false
        }
        loop={loop}
        slidesPerView={slidesPerView}
        spaceBetween={spaceBetween}
        style={{ width: '100%' }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            {slide.html ? (
              <div dangerouslySetInnerHTML={{ __html: slide.html }} />
            ) : (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {slide.src && (
                  <img
                    src={slide.src}
                    alt={slide.alt ?? ''}
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                )}
                {slide.text && (
                  <p
                    style={{
                      position: slide.src ? 'absolute' : 'relative',
                      bottom: slide.src ? '1rem' : undefined,
                      background: slide.src ? 'rgba(0,0,0,0.55)' : undefined,
                      color: slide.src ? '#fff' : undefined,
                      padding: '0.5rem 1rem',
                      margin: 0,
                      borderRadius: '0.25rem',
                      textAlign: 'center',
                    }}
                  >
                    {slide.text}
                  </p>
                )}
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
`;
}
