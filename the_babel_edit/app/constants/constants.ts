// Image paths
export const IMAGES = {
  // Logo images
  LOGO_WHITE: '/images/babel_logo_white.jpg',
  LOGO_DARK: '/images/babel_logo_black.jpg',
  LOGO_WHITE_RM: '/images/babel_logo_white-removebg.png',
  LOGO_DARK_RM: '/images/babel_logo_black-removebg.png',
  LOGO_ICON_BLACK: '/images/babel_black_icon.png',
  
  // Hero/Header images
  HERO_BG: '/images/hero-bg.jpg',
  
  // Icons
  ICONS: {

  },
  
  // Placeholder images
  PLACEHOLDERS: {
    AVATAR: '/images/placeholders/avatar.png',
    THUMBNAIL: '/images/placeholders/thumbnail.jpg',
  },
  
  // Social media icons
  SOCIAL: {
    FACEBOOK: '/images/social/facebook.svg',
    TWITTER: '/images/social/twitter.svg',
    INSTAGRAM: '/images/social/instagram.svg',
    LINKEDIN: '/images/social/linkedin.svg',
  },
} as const;

// Image dimensions
export const IMAGE_SIZES = {
  THUMBNAIL: {
    WIDTH: 300,
    HEIGHT: 200,
  },
  AVATAR: {
    WIDTH: 100,
    HEIGHT: 100,
  },
  HERO: {
    WIDTH: 1920,
    HEIGHT: 1080,
  },
} as const;

// Image quality settings
export const IMAGE_QUALITY = {
  HIGH: 90,
  MEDIUM: 75,
  LOW: 50,
} as const;
