import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

export const createFeedback = async (req, res) => {
  const { type, message, pageUrl } = req.body;
  const userId = req.user?.userId || req.user?.id;

  // Validate required fields
  if (!type || typeof type !== 'string' || !type.trim()) {
    return res.status(400).json({ error: 'Feedback type is required' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Feedback message is required' });
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        type,
        message,
        pageUrl,
        userId: userId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await appendAuditLog({
      action: 'create_feedback', resource: 'Feedback', resourceId: feedback.id,
      details: { feedbackId: feedback.id, type, pageUrl },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
};

export const getAllFeedbacks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.feedback.count(),
    ]);
    res.status(200).json({ feedbacks, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error getting feedbacks:', error);
    res.status(500).json({ error: 'Failed to get feedbacks' });
  }
};

export const updateFeedback = async (req, res) => {
  const { id } = req.params;
  const { isResolved, isFeatured } = req.body;

  try {
    // Check existence first
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        ...(isResolved !== undefined && { isResolved }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await appendAuditLog({
      action: 'update_feedback', resource: 'Feedback', resourceId: id,
      details: { feedbackId: id, ...(isResolved !== undefined && { isResolved }), ...(isFeatured !== undefined && { isFeatured }) },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
};

export const deleteFeedback = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await prisma.feedback.delete({
      where: { id },
    });

    await appendAuditLog({
      action: 'delete_feedback', resource: 'Feedback', resourceId: id,
      details: { feedbackId: id }, severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
};

export const getFeaturedFeedbacks = async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        isFeatured: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error('Error getting featured feedbacks:', error);
    res.status(500).json({ error: 'Failed to get featured feedbacks' });
  }
};
