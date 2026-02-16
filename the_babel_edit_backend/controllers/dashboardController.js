import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// === HERO SLIDES ===

export const getHeroSlides = async (req, res) => {
  try {
    const heroSlides = await prisma.heroSlide.findMany({
      orderBy: { position: "asc" },
    });
    res.status(200).json(heroSlides);
  } catch (error) {
    console.error("Error fetching hero slides:", error);
    res.status(500).json({ error: error.message || "Failed to fetch hero slides" });
  }
};

export const updateHeroSlides = async (req, res) => {
  try {
    const { slides } = req.body;

    if (!Array.isArray(slides)) {
      return res.status(400).json({ error: "Invalid request. Expected 'slides' array." });
    }

    // Clear existing slides and insert new ones
    await prisma.heroSlide.deleteMany({});

    const newSlides = await Promise.all(
      slides.map((slide, index) => {
        // Normalize possible image field names from the frontend
        const imageUrl = slide.imageUrl || slide.image || slide.src || '';

        return prisma.heroSlide.create({
          data: {
            imageUrl,
            alt: slide.alt || "",
            description: slide.description || "",
            position: index,
          },
        });
      })
    );

    // Audit: hero slides updated
    await appendAuditLog({
      action: 'update_hero_slides',
      resource: 'Dashboard',
      details: { slideCount: newSlides.length },
      severity: 'info',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(200).json({ slides: newSlides });
  } catch (error) {
    console.error("Error updating hero slides:", error);
    res.status(500).json({ error: error.message || "Failed to update hero slides" });
  }
};

// === HIGHLIGHT CARDS ===

export const getHighlightCards = async (req, res) => {
  try {
    const highlightCards = await prisma.highlightCard.findMany({
      orderBy: { position: "asc" },
    });
    res.status(200).json(highlightCards);
  } catch (error) {
    console.error("Error fetching highlight cards:", error);
    res.status(500).json({ error: error.message || "Failed to fetch highlight cards" });
  }
};

export const updateHighlightCards = async (req, res) => {
  try {
    const { cards } = req.body;

    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: "Invalid request. Expected 'cards' array." });
    }

    // Clear existing cards and insert new ones
    await prisma.highlightCard.deleteMany({});

    const newCards = await Promise.all(
      cards.map((card, index) =>
        prisma.highlightCard.create({
          data: {
            title: card.title,
            description: card.description || "",
            imageUrl: card.imageUrl || null,
            position: index,
          },
        })
      )
    );

    // Audit: highlight cards updated
    await appendAuditLog({
      action: 'update_highlight_cards',
      resource: 'Dashboard',
      details: { cardCount: newCards.length },
      severity: 'info',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(200).json({ cards: newCards });
  } catch (error) {
    console.error("Error updating highlight cards:", error);
    res.status(500).json({ error: error.message || "Failed to update highlight cards" });
  }
};

// === SUMMER BANNER ===

export const getSummerBanner = async (req, res) => {
  try {
    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      // Create default config if not exists
      config = await prisma.dashboardConfig.create({
        data: {
          summerBannerTitle: "Summer Collection",
          summerBannerDescription: "Limited time offer - Don't miss out!",
          summerBannerButtonText: "Shop Now",
          summerBannerCountdownDays: 0,
          summerBannerCountdownHours: 0,
          summerBannerCountdownMinutes: 0,
          summerBannerCountdownSeconds: 0,
        },
      });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching summer banner:", error);
    res.status(500).json({ error: error.message || "Failed to fetch summer banner" });
  }
};

export const updateSummerBanner = async (req, res) => {
  try {
    const {
      summerBannerTitle,
      summerBannerDescription,
      summerBannerButtonText,
      summerBannerCountdownDays,
      summerBannerCountdownHours,
      summerBannerCountdownMinutes,
      summerBannerCountdownSeconds,
      summerBannerBackgroundImage,
    } = req.body;

    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: {
          summerBannerTitle: summerBannerTitle || "Summer Collection",
          summerBannerDescription: summerBannerDescription || "Limited time offer - Don't miss out!",
          summerBannerButtonText: summerBannerButtonText || "Shop Now",
          summerBannerCountdownDays: summerBannerCountdownDays || 0,
          summerBannerCountdownHours: summerBannerCountdownHours || 0,
          summerBannerCountdownMinutes: summerBannerCountdownMinutes || 0,
          summerBannerCountdownSeconds: summerBannerCountdownSeconds || 0,
          summerBannerBackgroundImage: summerBannerBackgroundImage || null,
        },
      });
    } else {
      config = await prisma.dashboardConfig.update({
        where: { id: config.id },
        data: {
          summerBannerTitle: summerBannerTitle !== undefined ? summerBannerTitle : config.summerBannerTitle,
          summerBannerDescription: summerBannerDescription !== undefined ? summerBannerDescription : config.summerBannerDescription,
          summerBannerButtonText: summerBannerButtonText !== undefined ? summerBannerButtonText : config.summerBannerButtonText,
          summerBannerCountdownDays: summerBannerCountdownDays !== undefined ? summerBannerCountdownDays : config.summerBannerCountdownDays,
          summerBannerCountdownHours: summerBannerCountdownHours !== undefined ? summerBannerCountdownHours : config.summerBannerCountdownHours,
          summerBannerCountdownMinutes: summerBannerCountdownMinutes !== undefined ? summerBannerCountdownMinutes : config.summerBannerCountdownMinutes,
          summerBannerCountdownSeconds: summerBannerCountdownSeconds !== undefined ? summerBannerCountdownSeconds : config.summerBannerCountdownSeconds,
          summerBannerBackgroundImage: summerBannerBackgroundImage !== undefined ? summerBannerBackgroundImage : config.summerBannerBackgroundImage,
        },
      });
    }

    // Audit: summer banner updated
    await appendAuditLog({
      action: 'update_summer_banner',
      resource: 'Dashboard',
      resourceId: config.id,
      details: { title: config.summerBannerTitle },
      severity: 'info',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(200).json(config);
  } catch (error) {
    console.error("Error updating summer banner:", error);
    res.status(500).json({ error: error.message || "Failed to update summer banner" });
  }
};

// === DASHBOARD CONFIG ===

export const getDashboardConfig = async (req, res) => {
  try {
    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: {
          summerBannerTitle: "Summer Collection",
          summerBannerButtonText: "Shop Now",
        },
      });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching dashboard config:", error);
    res.status(500).json({ error: error.message || "Failed to fetch dashboard config" });
  }
};

export const updateDashboardConfig = async (req, res) => {
  try {
    const updateData = req.body;

    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: updateData,
      });
    } else {
      config = await prisma.dashboardConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    // Audit: dashboard config updated
    await appendAuditLog({
      action: 'update_dashboard_config',
      resource: 'Dashboard',
      resourceId: config.id,
      details: { updatedFields: Object.keys(updateData) },
      severity: 'info',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(200).json(config);
  } catch (error) {
    console.error("Error updating dashboard config:", error);
    res.status(500).json({ error: error.message || "Failed to update dashboard config" });
  }
};

// === LANDING PAGE ===

export const getLandingPage = async (req, res) => {
  try {
    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      // Create default config if not exists
      config = await prisma.dashboardConfig.create({
        data: {
          landingPageBackgroundMode: "NONE",
          landingPageTitle: "Welcome to The Babel Edit",
          landingPageSubtitle: "Discover Premium Fashion & Lifestyle",
          landingPageButtonText: "Shop Now",
          landingPageButtonLink: "/products",
          landingPageOverlayOpacity: 40,
        },
      });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching landing page:", error);
    res.status(500).json({ error: error.message || "Failed to fetch landing page" });
  }
};

export const updateLandingPage = async (req, res) => {
  try {
    const {
      landingPageBackgroundMode,
      landingPageBackgroundImage,
      landingPageVideoUrl,
      landingPageTitle,
      landingPageSubtitle,
      landingPageButtonText,
      landingPageButtonLink,
      landingPageOverlayOpacity,
    } = req.body;

    let config = await prisma.dashboardConfig.findFirst();

    if (!config) {
      config = await prisma.dashboardConfig.create({
        data: {
          landingPageBackgroundMode: landingPageBackgroundMode || "NONE",
          landingPageBackgroundImage: landingPageBackgroundImage || null,
          landingPageVideoUrl: landingPageVideoUrl || null,
          landingPageTitle: landingPageTitle || "Welcome to The Babel Edit",
          landingPageSubtitle: landingPageSubtitle || "Discover Premium Fashion & Lifestyle",
          landingPageButtonText: landingPageButtonText || "Shop Now",
          landingPageButtonLink: landingPageButtonLink || "/products",
          landingPageOverlayOpacity: landingPageOverlayOpacity || 40,
        },
      });
    } else {
      config = await prisma.dashboardConfig.update({
        where: { id: config.id },
        data: {
          landingPageBackgroundMode: landingPageBackgroundMode !== undefined ? landingPageBackgroundMode : config.landingPageBackgroundMode,
          landingPageBackgroundImage: landingPageBackgroundImage !== undefined ? landingPageBackgroundImage : config.landingPageBackgroundImage,
          landingPageVideoUrl: landingPageVideoUrl !== undefined ? landingPageVideoUrl : config.landingPageVideoUrl,
          landingPageTitle: landingPageTitle !== undefined ? landingPageTitle : config.landingPageTitle,
          landingPageSubtitle: landingPageSubtitle !== undefined ? landingPageSubtitle : config.landingPageSubtitle,
          landingPageButtonText: landingPageButtonText !== undefined ? landingPageButtonText : config.landingPageButtonText,
          landingPageButtonLink: landingPageButtonLink !== undefined ? landingPageButtonLink : config.landingPageButtonLink,
          landingPageOverlayOpacity: landingPageOverlayOpacity !== undefined ? landingPageOverlayOpacity : config.landingPageOverlayOpacity,
        },
      });
    }

    // Audit: landing page updated
    await appendAuditLog({
      action: 'update_landing_page',
      resource: 'Dashboard',
      resourceId: config.id,
      details: { backgroundMode: config.landingPageBackgroundMode, title: config.landingPageTitle },
      severity: 'info',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(200).json(config);
  } catch (error) {
    console.error("Error updating landing page:", error);
    res.status(500).json({ error: error.message || "Failed to update landing page" });
  }
};

