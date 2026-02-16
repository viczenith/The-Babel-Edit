'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Star } from 'lucide-react';

interface Feedback {
  id: string;
  message: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
}

interface Testimonial {
  id: string;
  comment: string;
  rating: number;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface FeedbackCarouselProps {
  feedbacks?: Feedback[];
  testimonials?: Testimonial[];
}

const FeedbackCarousel: React.FC<FeedbackCarouselProps> = ({ feedbacks, testimonials }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
  }, [emblaApi, setScrollSnaps, onSelect]);

  // Determine which data to display
  const items = testimonials || feedbacks || [];

  return (
    <div className="overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((item) => {
            const isTestimonial = 'comment' in item;
            const message = isTestimonial ? (item as Testimonial).comment : (item as Feedback).message;
            const user = item.user;
            const rating = isTestimonial ? (item as Testimonial).rating : null;

            return (
              <div className="flex-[0_0_100%] min-w-0 p-4" key={item.id}>
                <div className="p-8 text-center h-full flex flex-col justify-center items-center">
                  {/* Star Rating for testimonials */}
                  {rating && (
                    <div className="flex items-center justify-center mb-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`w-5 h-5 ${
                            index < rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Message/Comment */}
                  <p className="italic text-gray-600 mb-6 text-lg leading-relaxed">"{message}"</p>

                  {/* User Info */}
                  <div className="flex items-center justify-center">
                    <img
                      src={user?.avatar && user.avatar.trim() ? user.avatar : '/images/babel_logo_black.jpg'}
                      alt={user ? `${user.firstName} ${user.lastName}'s avatar` : 'Anonymous user avatar'}
                      className="w-14 h-14 rounded-full mr-4 object-cover border-2 border-gray-200"
                    />
                    <div>
                      <div className="font-semibold text-gray-800 text-lg">
                        {user ? `${user.firstName} ${user.lastName}` : 'Anonymous'}
                      </div>
                      {isTestimonial && (
                        <div className="text-sm text-gray-500">Verified Customer</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center mt-4">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`bg-gray-300 border-0 rounded-full w-3 h-3 mx-1 cursor-pointer p-0 transition-all ${
              index === selectedIndex ? 'bg-gray-700 w-8' : ''
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeedbackCarousel;
