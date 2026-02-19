import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

export const createReview = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check email verification
        const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
        if (!caller?.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before leaving a review.' });
        }

        const { productId, rating, title, comment } = req.body;

        // Validate input
        if (!productId || rating === undefined || rating === null) {
            return res.status(400).json({ message: 'Product ID and rating are required.' });
        }

        const parsedRating = parseInt(rating, 10);
        if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
        }

        const newReview = await prisma.review.create({
            data: {
                userId,
                productId,
                rating: parsedRating,
                title,
                comment,
            },
        });

        await appendAuditLog({
          action: 'create_review', resource: 'Review', resourceId: newReview.id,
          details: { reviewId: newReview.id, productId, rating },
          user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
        });

        res.status(201).json(newReview);
    } catch (error) {
        console.error('Create review error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'You have already reviewed this product.' });
        }
        res.status(500).json({ message: 'Failed to create review.' });
    }
};

export const getReviews = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.review.count(),
        ]);
        res.json({ reviews, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Failed to fetch reviews.' });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const existing = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!existing) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        await prisma.review.delete({
            where: { id: reviewId },
        });

        await appendAuditLog({
          action: 'delete_review', resource: 'Review', resourceId: reviewId,
          details: { reviewId }, severity: 'warning',
          user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
        });

        res.status(200).json({ message: 'Review deleted successfully.' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Failed to delete review.' });
    }
};
