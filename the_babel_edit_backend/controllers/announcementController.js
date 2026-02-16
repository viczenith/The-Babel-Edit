import prisma from '../prismaClient.js';

// ==========================================
// PUBLIC: Get active announcements
// ==========================================
export const getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// ==========================================
// ADMIN: Get all announcements (including inactive/expired)
// ==========================================
export const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// ==========================================
// ADMIN: Create announcement
// ==========================================
export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'INFO',
      linkText,
      linkUrl,
      backgroundColor,
      textColor,
      isActive = true,
      isDismissible = true,
      priority = 0,
      startDate,
      endDate,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const validTypes = ['SALE', 'INFO', 'NEW_ARRIVAL', 'WARNING', 'CUSTOM'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        type,
        linkText: linkText || null,
        linkUrl: linkUrl || null,
        backgroundColor: backgroundColor || null,
        textColor: textColor || null,
        isActive,
        isDismissible,
        priority: parseInt(priority) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

// ==========================================
// ADMIN: Update announcement
// ==========================================
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      message,
      type,
      linkText,
      linkUrl,
      backgroundColor,
      textColor,
      isActive,
      isDismissible,
      priority,
      startDate,
      endDate,
    } = req.body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (type) {
      const validTypes = ['SALE', 'INFO', 'NEW_ARRIVAL', 'WARNING', 'CUSTOM'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      }
    }

    const effectiveStart = startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate;
    const effectiveEnd = endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;

    if (effectiveStart && effectiveEnd && effectiveStart >= effectiveEnd) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(type !== undefined && { type }),
        ...(linkText !== undefined && { linkText: linkText || null }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
        ...(backgroundColor !== undefined && { backgroundColor: backgroundColor || null }),
        ...(textColor !== undefined && { textColor: textColor || null }),
        ...(isActive !== undefined && { isActive }),
        ...(isDismissible !== undefined && { isDismissible }),
        ...(priority !== undefined && { priority: parseInt(priority) || 0 }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    res.json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
};

// ==========================================
// ADMIN: Toggle announcement active status
// ==========================================
export const toggleAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    res.json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle announcement' });
  }
};

// ==========================================
// ADMIN: Delete announcement
// ==========================================
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await prisma.announcement.delete({ where: { id } });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};
