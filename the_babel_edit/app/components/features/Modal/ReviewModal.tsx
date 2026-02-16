'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { ReviewModalProps } from '@/app/lib/types';

const ReviewModal = ({ isOpen, onClose, product, onSubmit }: ReviewModalProps) => {
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);

    if (!isOpen) return null;

    const handleSubmitting = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }
        if (!title.trim()) {
            toast.error('Please enter a review title');
            return;
        }
        if (!comment.trim()) {
            toast.error('Please enter a review comment');
            return;
        }
        onSubmit({ rating, title, comment });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Leave a Review for {product.name}</h2>
                <form onSubmit={handleSubmitting}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-8 h-8 cursor-pointer ${(hoverRating || rating) >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Review Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your review a title"
                            className="w-full p-2 border rounded"
                            maxLength={100}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full p-2 border rounded"
                            placeholder="Share your experience with this product"
                            rows={4}
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[var(--color-primary-light)] text-white rounded">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
