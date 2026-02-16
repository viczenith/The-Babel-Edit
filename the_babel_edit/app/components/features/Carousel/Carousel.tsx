'use client';

import React, { useState, useEffect } from 'react';
import styles from './Carousel.module.css';

interface Slide {
  id: string;
  image: string;
  alt: string;
}

interface CarouselProps {
  slides: Slide[];
  height?: string;
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  height = '400px',
  autoPlay = true,
  interval = 5000,
  showDots = true,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className={styles.carousel} style={{ height }}>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`${styles.slide} ${index === currentSlide ? styles.active : ''}`}
          style={{ backgroundImage: slide.image && slide.image.trim() ? `url(${slide.image})` : 'none', backgroundColor: '#f0f0f0' }}
          role="img"
          aria-label={slide.alt || 'Carousel slide'}
        >
          {slide.image && slide.image.trim() && (
            <img
              src={slide.image}
              alt={slide.alt || 'Slide'}
              className={styles.hiddenImage}
              loading="lazy"
            />
          )}
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={goToPrevious}
            aria-label="Previous slide"
            type="button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={styles.arrowIcon}
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className={`${styles.navButton} ${styles.nextButton}`}
            onClick={goToNext}
            aria-label="Next slide"
            type="button"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={styles.arrowIcon}
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      {showDots && slides.length > 1 && (
        <div className={styles.dotsContainer}>
          {slides.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel; 