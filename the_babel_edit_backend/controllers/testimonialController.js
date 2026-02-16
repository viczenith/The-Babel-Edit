import fs from 'fs/promises';
import path from 'path';
import prisma from '../prismaClient.js';
import { fileURLToPath } from 'url';
import { appendAuditLog } from './adminController.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESTIMONIALS_FILE = path.join(__dirname, '../data/testimonials.json');

// Helper to read testimonials from file
const readTestimonialsFile = async () => {
    try {
        const data = await fs.readFile(TESTIMONIALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(path.dirname(TESTIMONIALS_FILE), { recursive: true });
            await fs.writeFile(TESTIMONIALS_FILE, JSON.stringify([]), 'utf8');
            return [];
        }
        throw error;
    }
};

// Helper to write testimonials to file
const writeTestimonialsFile = async (testimonials) => {
    await fs.writeFile(TESTIMONIALS_FILE, JSON.stringify(testimonials, null, 2), 'utf8');
};

// Get featured testimonials (review IDs)
export const getFeaturedTestimonials = async (req, res) => {
    try {
        const testimonialIds = await readTestimonialsFile();
        // Fetch full review data for these IDs if needed, or just return IDs
        res.json(testimonialIds);
    } catch (error) {
        console.error('Get featured testimonials error:', error);
        res.status(500).json({ message: 'Failed to fetch featured testimonials.' });
    }
};

// Add a review as a testimonial
export const addTestimonial = async (req, res) => {
    try {
        const { reviewId } = req.body;

        if (!reviewId) {
            return res.status(400).json({ message: 'Review ID is required.' });
        }

        let testimonialIds = await readTestimonialsFile();

        // Check if review exists
        const review = await prisma.review.findUnique({
            where: { id: reviewId }
        });

        if (!review) {
            return res.status(404).json({ message: 'Review not found.' });
        }

        if (!testimonialIds.includes(reviewId)) {
            testimonialIds.push(reviewId);
            await writeTestimonialsFile(testimonialIds);
        }

        await appendAuditLog({
          action: 'add_testimonial', resource: 'Testimonial', resourceId: reviewId,
          details: { reviewId },
          user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
        });

        res.status(200).json({ message: 'Review added as testimonial.', testimonialIds });
    } catch (error) {
        console.error('Add testimonial error:', error);
        res.status(500).json({ message: 'Failed to add testimonial.' });
    }
};

// Remove a review from testimonials
export const removeTestimonial = async (req, res) => {
    try {
        const { reviewId } = req.params;

        let testimonialIds = await readTestimonialsFile();
        const initialLength = testimonialIds.length;

        testimonialIds = testimonialIds.filter(id => id !== reviewId);

        if (testimonialIds.length < initialLength) {
            await writeTestimonialsFile(testimonialIds);

            await appendAuditLog({
              action: 'remove_testimonial', resource: 'Testimonial', resourceId: reviewId,
              details: { reviewId }, severity: 'warning',
              user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
            });

            res.status(200).json({ message: 'Review removed from testimonials.', testimonialIds });
        } else {
            res.status(404).json({ message: 'Testimonial not found in featured list.' });
        }
    } catch (error) {
        console.error('Remove testimonial error:', error);
        res.status(500).json({ message: 'Failed to remove testimonial.' });
    }
};

export const getPublicTestimonials = async (req, res) => {
    try {
        const testimonialIds = await readTestimonialsFile();
        if (testimonialIds.length === 0) {
            return res.json([]);
        }

        const testimonials = await prisma.review.findMany({
            where: {
                id: {
                    in: testimonialIds,
                },
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });

        res.json(testimonials);
    } catch (error) {
        console.error('Get public testimonials error:', error);
        res.status(500).json({ message: 'Failed to fetch testimonials.' });
    }
};
