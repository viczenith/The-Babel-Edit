'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Edit2, X, Plus, Save, AlertCircle, Upload } from 'lucide-react';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { commonClasses } from '@/app/utils/designSystem';
// import Button from '@/components/ui/button';
import Button from '@/app/components/ui/Button/Button';
import AnnouncementManager from './AnnouncementManager';

interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  description: string;
}

interface HighlightCard {
  id: string;
  title: string;
  description: string;
  image: string;
  position?: number;
}

interface SummerBanner {
  id?: string;
  summerBannerTitle: string;
  summerBannerDescription: string;
  summerBannerButtonText: string;
  summerBannerCountdownDays: number;
  summerBannerCountdownHours: number;
  summerBannerCountdownMinutes: number;
  summerBannerCountdownSeconds: number;
  summerBannerBackgroundImage: string;
  summerBannerLinkText: string;
  summerBannerLinkUrl: string;
  summerBannerStartDate: string | null;
  summerBannerEndDate: string | null;
  summerBannerBgColor: string;
  summerBannerTextColor: string;
  summerBannerPriority: number;
}

interface LandingPage {
  id?: string;
  landingPageBackgroundMode: 'NONE' | 'IMAGE' | 'VIDEO';
  landingPageBackgroundImage: string;
  landingPageVideoUrl: string;
  landingPageTitle: string;
  landingPageSubtitle: string;
  landingPageButtonText: string;
  landingPageButtonLink: string;
  landingPageOverlayOpacity: number;
  landingPageLinkText: string;
  landingPageLinkUrl: string;
  landingPageStartDate: string | null;
  landingPageEndDate: string | null;
  landingPageBgColor: string;
  landingPageTextColor: string;
  landingPagePriority: number;
}

const DashboardManager = () => {
  // Hero Slides State
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroErrors, setHeroErrors] = useState<{ [id: string]: string }>({});

  // Highlight Cards State
  const [highlightCards, setHighlightCards] = useState<HighlightCard[]>([]);
  const [editingCard, setEditingCard] = useState<HighlightCard | null>(null);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardUploading, setCardUploading] = useState(false);
  const [cardErrors, setCardErrors] = useState<{ [id: string]: string }>({});

  // Summer Banner State
  const [summerBanner, setSummerBanner] = useState<SummerBanner>({
    summerBannerTitle: 'SUMMER COLLECTIONS',
    summerBannerDescription: 'Limited time offer - Don\'t miss out!',
    summerBannerButtonText: 'SHOP NOW →',
    summerBannerCountdownDays: 7,
    summerBannerCountdownHours: 8,
    summerBannerCountdownMinutes: 4,
    summerBannerCountdownSeconds: 5,
    summerBannerBackgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop&crop=center',
    summerBannerLinkText: '',
    summerBannerLinkUrl: '',
    summerBannerStartDate: null,
    summerBannerEndDate: null,
    summerBannerBgColor: '',
    summerBannerTextColor: '',
    summerBannerPriority: 0
  });
  const [editingBanner, setEditingBanner] = useState<SummerBanner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerErrors, setBannerErrors] = useState<{ [key: string]: string }>({});

  // Landing Page State
  const [landingPage, setLandingPage] = useState<LandingPage>({
    landingPageBackgroundMode: 'NONE',
    landingPageBackgroundImage: '',
    landingPageVideoUrl: '',
    landingPageTitle: 'Welcome to The Babel Edit',
    landingPageSubtitle: 'Discover Premium Fashion & Lifestyle',
    landingPageButtonText: 'Shop Now',
    landingPageButtonLink: '/products',
    landingPageOverlayOpacity: 40,
    landingPageLinkText: '',
    landingPageLinkUrl: '',
    landingPageStartDate: null,
    landingPageEndDate: null,
    landingPageBgColor: '',
    landingPageTextColor: '',
    landingPagePriority: 0
  });
  const [editingLandingPage, setEditingLandingPage] = useState<LandingPage | null>(null);
  const [landingPageLoading, setLandingPageLoading] = useState(true);
  const [landingPageUploading, setLandingPageUploading] = useState(false);
  const [landingPageErrors, setLandingPageErrors] = useState<{ [key: string]: string }>({});
  const [dragLandingVideo, setDragLandingVideo] = useState(false);
  const [dragLandingFallback, setDragLandingFallback] = useState(false);

  // Drag states
  const [dragHeroId, setDragHeroId] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragBanner, setDragBanner] = useState(false);

  // Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'slide' | 'card' | null; id: string | null; name: string }>({
    type: null,
    id: null,
    name: ''
  });

  // Load data on mount
  useEffect(() => {
    fetchHeroSlides();
    fetchHighlightCards();
    fetchSummerBanner();
    fetchLandingPage();
  }, []);

  // ==== IMAGE UPLOAD HELPERS ====
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await apiRequest<{ imageUrl: string }>(
        API_ENDPOINTS.PRODUCTS.ADMIN.UPLOAD_IMAGE,
        {
          method: 'POST',
          body: formData,
          requireAuth: true,
          isFormData: true
        }
      );

      return response?.imageUrl || null;
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Failed to upload image');
      return null;
    }
  };

  // ==== HERO SLIDES ====
  const fetchHeroSlides = async () => {
    try {
      setHeroLoading(true);
      const data = await apiRequest<any[]>(
        API_ENDPOINTS.DASHBOARD.GET_HERO_SLIDES
      );
      const normalized = (Array.isArray(data) ? data : []).map((s: any) => ({
        id: s.id || s._id || String(Date.now()) + Math.random(),
        image: s.image || s.imageUrl || s.src || '',
        alt: s.alt || '',
        description: s.description || ''
      }));
      setHeroSlides(normalized);
    } catch (error) {
      console.error('Failed to fetch hero slides:', error);
      toast.error('Failed to load hero slides');
    } finally {
      setHeroLoading(false);
    }
  };

  const saveHeroSlides = async () => {
    try {
      // If an individual slide is being edited, merge its pending changes into the array
      let slidesSnapshot: HeroSlide[] = heroSlides;
      if (editingSlide) {
        slidesSnapshot = heroSlides.map(s => s.id === editingSlide.id ? { ...s, ...editingSlide } : s);
        setHeroSlides(slidesSnapshot);
      }

      // Validate that alt and image are not empty
      const errors: { [id: string]: string } = {};
      slidesSnapshot.forEach(slide => {
        if (!slide.image || slide.image.toString().trim() === '') {
          errors[slide.id] = 'Image is required';
        }
        if (!slide.alt || slide.alt.toString().trim() === '') {
          errors[slide.id] = 'Alt text is required';
        }
      });

      if (Object.keys(errors).length > 0) {
        setHeroErrors(errors);
        toast.error('Please fill in all required fields for hero slides');
        return;
      }

      setHeroErrors({});

      // Ensure payload uses `imageUrl` (backend expects imageUrl/image/src)
      const payloadSlides = slidesSnapshot.map(s => ({
        id: s.id,
        imageUrl: (s as any).image || (s as any).imageUrl || (s as any).src || '',
        alt: s.alt || '',
        description: s.description || ''
      }));

      await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_HERO_SLIDES,
        {
          method: 'POST',
          body: { slides: payloadSlides },
          requireAuth: true
        }
      );
      toast.success('Hero slides updated successfully!');
      setEditingSlide(null);
      // Refresh from server
      fetchHeroSlides();
    } catch (error) {
      console.error('Failed to save hero slides:', error);
      toast.error('Failed to save hero slides');
    }
  };

  const handleSlideChange = (field: keyof HeroSlide, value: string) => {
    if (editingSlide) {
      setEditingSlide({ ...editingSlide, [field]: value });
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeroUploading(true);
    const imageUrl = await uploadImage(file);
    setHeroUploading(false);

    if (imageUrl) {
      const updatedSlides = heroSlides.map(s =>
        s.id === slideId ? { ...s, image: imageUrl } : s
      );
      setHeroSlides(updatedSlides);
      
      if (editingSlide?.id === slideId) {
        setEditingSlide({ ...editingSlide, image: imageUrl });
      }
      toast.success('Image uploaded');
    }
  };

  const handleHeroDragDrop = async (e: React.DragEvent<HTMLDivElement>, slideId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragHeroId(null);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    setHeroUploading(true);
    const imageUrl = await uploadImage(file);
    setHeroUploading(false);

    if (imageUrl) {
      const updatedSlides = heroSlides.map(s =>
        s.id === slideId ? { ...s, image: imageUrl } : s
      );
      setHeroSlides(updatedSlides);
      
      if (editingSlide?.id === slideId) {
        setEditingSlide({ ...editingSlide, image: imageUrl });
      }
      toast.success('Image uploaded');
    }
  };

  const startEditSlide = (slide: HeroSlide) => {
    setEditingSlide({
      id: slide.id,
      image: (slide as any).image || (slide as any).imageUrl || (slide as any).src || '',
      alt: (slide as any).alt || (slide as any).title || '',
      description: (slide as any).description || (slide as any).desc || ''
    });
  };

  const removeSlide = (id: string) => {
    const slide = heroSlides.find(s => s.id === id);
    setConfirmDelete({
      type: 'slide',
      id,
      name: slide?.alt || 'Untitled Slide'
    });
  };

  const confirmRemoveSlide = async () => {
    if (!confirmDelete.id) return;
    try {
      const updatedSlides = heroSlides.filter(s => s.id !== confirmDelete.id);
      setHeroSlides(updatedSlides);

      // Transform to backend format and save immediately
      const payloadSlides = updatedSlides.map(s => ({
        id: s.id,
        imageUrl: (s as any).image || (s as any).imageUrl || (s as any).src || '',
        alt: s.alt || '',
        description: s.description || ''
      }));

      await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_HERO_SLIDES,
        {
          method: 'POST',
          body: { slides: payloadSlides },
          requireAuth: true
        }
      );
      
      toast.success('Hero slide deleted');
      if (editingSlide?.id === confirmDelete.id) {
        setEditingSlide(null);
      }
      setConfirmDelete({ type: null, id: null, name: '' });
    } catch (error) {
      console.error('Failed to delete slide:', error);
      toast.error('Failed to delete slide');
      fetchHeroSlides();
    }
  };

  const addNewSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now().toString(),
      image: '',
      alt: '',
      description: ''
    };
    setHeroSlides([...heroSlides, newSlide]);
    setEditingSlide(newSlide);
  };

  // ==== HIGHLIGHT CARDS ====
  const fetchHighlightCards = async () => {
    try {
      setCardsLoading(true);
      const data = await apiRequest<any[]>(
        API_ENDPOINTS.DASHBOARD.GET_HIGHLIGHT_CARDS
      );
      const normalized = (Array.isArray(data) ? data : []).map((c: any) => ({
        id: c.id || c._id || String(Date.now()) + Math.random(),
        title: c.title || '',
        description: c.description || '',
        image: c.image || c.imageUrl || c.src || '', // Convert 'imageUrl' to 'image' for frontend
        position: c.position || 0
      }));
      // Normalize and set cards
      setHighlightCards(normalized);
    } catch (error) {
      console.error('Failed to fetch highlight cards:', error);
      toast.error('Failed to load highlight cards');
    } finally {
      setCardsLoading(false);
    }
  };

  const saveHighlightCards = async () => {
    try {
      // If an individual card is being edited, merge its pending changes into the array
      let cardsSnapshot: HighlightCard[] = highlightCards;
      if (editingCard) {
        cardsSnapshot = highlightCards.map(c => c.id === editingCard.id ? { ...c, ...editingCard } : c);
        // update state immediately so UI reflects merged changes
        setHighlightCards(cardsSnapshot);
      }

      // Validate that title is required only when the card has other content
      const errors: { [id: string]: string } = {};
      cardsSnapshot.forEach(card => {
        const hasImage = !!(card.image && card.image.toString().trim());
        const hasDescription = !!(card.description && card.description.toString().trim());
        const hasTitle = !!(card.title && card.title.toString().trim());
        const hasAnyContent = hasImage || hasDescription || hasTitle;

        // If the card has any content (image/description/title) but the title is empty, require it
        if (hasAnyContent && !hasTitle) {
          errors[card.id] = 'Title is required when card has content';
        }
      });

      if (Object.keys(errors).length > 0) {
        setCardErrors(errors);
        toast.error('Please fill in title for all cards that have content');
        return;
      }

      // Clear previous errors
      setCardErrors({});

      // Transform frontend format (image) to backend format (imageUrl)
      const cardsToSave = cardsSnapshot.map(card => ({
        id: card.id,
        title: card.title.trim(),
        description: (card.description || '').trim(),
        imageUrl: card.image || '', // Transform 'image' to 'imageUrl' for backend
        position: card.position || 0
      }));

      const response = await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_HIGHLIGHT_CARDS,
        {
          method: 'POST',
          body: { cards: cardsToSave },
          requireAuth: true
        }
      );
      // on success
      toast.success('Highlight cards updated successfully!');
      // Clear editing state and refresh from server to verify save
      setEditingCard(null);
      await fetchHighlightCards();
    } catch (error) {
      console.error('Failed to save highlight cards:', error);
      toast.error('Failed to save highlight cards');
    }
  };

  const handleCardChange = (field: keyof HighlightCard, value: string) => {
    if (editingCard) {
      setEditingCard({ ...editingCard, [field]: value });
    }
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCardUploading(true);
    const imageUrl = await uploadImage(file);
    setCardUploading(false);

    if (imageUrl) {
      const updatedCards = highlightCards.map(c =>
        c.id === cardId ? { ...c, image: imageUrl } : c
      );
      setHighlightCards(updatedCards);
      
      if (editingCard?.id === cardId) {
        setEditingCard({ ...editingCard, image: imageUrl });
      }
      toast.success('Image uploaded');
    }
  };

  const handleCardDragDrop = async (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCardId(null);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    setCardUploading(true);
    const imageUrl = await uploadImage(file);
    setCardUploading(false);

    if (imageUrl) {
      const updatedCards = highlightCards.map(c =>
        c.id === cardId ? { ...c, image: imageUrl } : c
      );
      setHighlightCards(updatedCards);
      
      if (editingCard?.id === cardId) {
        setEditingCard({ ...editingCard, image: imageUrl });
      }
      toast.success('Image uploaded');
    }
  };

  const startEditCard = (card: HighlightCard) => {
    setEditingCard({
      id: card.id,
      title: (card as any).title || (card as any).name || '',
      description: (card as any).description || (card as any).desc || '',
      image: (card as any).image || (card as any).imageUrl || (card as any).src || '',
      position: (card as any).position || 0
    });
  };

  const removeCard = (id: string) => {
    const card = highlightCards.find(c => c.id === id);
    setConfirmDelete({
      type: 'card',
      id,
      name: card?.title || 'Untitled Card'
    });
  };

  const confirmRemoveCard = async () => {
    if (!confirmDelete.id) return;
    try {
      // Remove from local state
      const updatedCards = highlightCards.filter(c => c.id !== confirmDelete.id);
      setHighlightCards(updatedCards);
      
      // Transform to backend format and save immediately
      const cardsToSave = updatedCards.map(card => ({
        id: card.id,
        title: card.title.trim(),
        description: (card.description || '').trim(),
        imageUrl: card.image || '',
        position: card.position || 0
      }));

      await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_HIGHLIGHT_CARDS,
        {
          method: 'POST',
          body: { cards: cardsToSave },
          requireAuth: true
        }
      );
      
      toast.success('Highlight card deleted');
      if (editingCard?.id === confirmDelete.id) {
        setEditingCard(null);
      }
      setConfirmDelete({ type: null, id: null, name: '' });
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error('Failed to delete card');
      // Refresh to restore state
      fetchHighlightCards();
    }
  };

  const addNewCard = () => {
    const newCard: HighlightCard = {
      id: Date.now().toString(),
      title: '',
      description: '',
      image: '',
      position: highlightCards.length + 1
    };
    setHighlightCards([...highlightCards, newCard]);
    setEditingCard(newCard);
  };

  // ==== SUMMER BANNER ====
  const fetchSummerBanner = async () => {
    try {
      setBannerLoading(true);
      const data = await apiRequest<any>(
        API_ENDPOINTS.DASHBOARD.GET_SUMMER_BANNER
      );
      if (data) {
        const normalized = {
          ...summerBanner,
          ...data,
          summerBannerBackgroundImage: data.summerBannerBackgroundImage || data.backgroundImage || data.image || '',
          summerBannerLinkText: data.summerBannerLinkText || '',
          summerBannerLinkUrl: data.summerBannerLinkUrl || '',
          summerBannerStartDate: data.summerBannerStartDate ? new Date(data.summerBannerStartDate).toISOString().slice(0, 16) : null,
          summerBannerEndDate: data.summerBannerEndDate ? new Date(data.summerBannerEndDate).toISOString().slice(0, 16) : null,
          summerBannerBgColor: data.summerBannerBgColor || '',
          summerBannerTextColor: data.summerBannerTextColor || '',
          summerBannerPriority: data.summerBannerPriority || 0
        } as SummerBanner;
        setSummerBanner(normalized);
      } else {
        setSummerBanner(summerBanner);
      }
    } catch (error) {
      console.error('Failed to fetch summer banner:', error);
      // Use default values on error
    } finally {
      setBannerLoading(false);
    }
  };

  const saveSummerBanner = async () => {
    try {
      const bannertosave = editingBanner || summerBanner;

      // Validate required fields
      const errors: { [key: string]: string } = {};
      if (!bannertosave.summerBannerTitle || bannertosave.summerBannerTitle.trim() === '') {
        errors['title'] = 'Title is required';
      }
      if (!bannertosave.summerBannerDescription || bannertosave.summerBannerDescription.trim() === '') {
        errors['description'] = 'Description is required';
      }
      if (!bannertosave.summerBannerButtonText || bannertosave.summerBannerButtonText.trim() === '') {
        errors['button'] = 'Button text is required';
      }
      if (!bannertosave.summerBannerBackgroundImage || bannertosave.summerBannerBackgroundImage.toString().trim() === '') {
        errors['image'] = 'Background image is required';
      }

      if (Object.keys(errors).length > 0) {
        setBannerErrors(errors);
        toast.error('Please fill in all required banner fields');
        return;
      }

      setBannerErrors({});

      const payload = {
        ...bannertosave,
        summerBannerLinkText: bannertosave.summerBannerLinkText || null,
        summerBannerLinkUrl: bannertosave.summerBannerLinkUrl || null,
        summerBannerStartDate: bannertosave.summerBannerStartDate || null,
        summerBannerEndDate: bannertosave.summerBannerEndDate || null,
        summerBannerBgColor: bannertosave.summerBannerBgColor || null,
        summerBannerTextColor: bannertosave.summerBannerTextColor || null,
      };

      await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_SUMMER_BANNER,
        {
          method: 'POST',
          body: payload,
          requireAuth: true
        }
      );
      toast.success('Summer banner updated successfully!');
      if (editingBanner) {
        setSummerBanner(editingBanner);
      }
      setEditingBanner(null);
      // Refresh from server
      fetchSummerBanner();
    } catch (error) {
      console.error('Failed to save summer banner:', error);
      toast.error('Failed to save summer banner');
    }
  };

  const handleBannerChange = (field: keyof SummerBanner, value: any) => {
    if (editingBanner) {
      setEditingBanner({ ...editingBanner, [field]: value });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploading(true);
    const imageUrl = await uploadImage(file);
    setBannerUploading(false);

    if (imageUrl) {
      handleBannerChange('summerBannerBackgroundImage', imageUrl);
      toast.success('Image uploaded');
    }
  };

  const handleBannerDragDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragBanner(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    setBannerUploading(true);
    const imageUrl = await uploadImage(file);
    setBannerUploading(false);

    if (imageUrl) {
      handleBannerChange('summerBannerBackgroundImage', imageUrl);
      toast.success('Image uploaded');
    }
  };

  // ==== LANDING PAGE ====
  const fetchLandingPage = async () => {
    try {
      setLandingPageLoading(true);
      const data = await apiRequest<any>(
        API_ENDPOINTS.DASHBOARD.GET_LANDING_PAGE
      );
      if (data) {
        const normalized = {
          landingPageBackgroundMode: data.landingPageBackgroundMode || 'NONE',
          landingPageBackgroundImage: data.landingPageBackgroundImage || '',
          landingPageVideoUrl: data.landingPageVideoUrl || '',
          landingPageTitle: data.landingPageTitle || 'Welcome to The Babel Edit',
          landingPageSubtitle: data.landingPageSubtitle || 'Discover Premium Fashion & Lifestyle',
          landingPageButtonText: data.landingPageButtonText || 'Shop Now',
          landingPageButtonLink: data.landingPageButtonLink || '/products',
          landingPageOverlayOpacity: data.landingPageOverlayOpacity || 40,
          landingPageLinkText: data.landingPageLinkText || '',
          landingPageLinkUrl: data.landingPageLinkUrl || '',
          landingPageStartDate: data.landingPageStartDate ? new Date(data.landingPageStartDate).toISOString().slice(0, 16) : null,
          landingPageEndDate: data.landingPageEndDate ? new Date(data.landingPageEndDate).toISOString().slice(0, 16) : null,
          landingPageBgColor: data.landingPageBgColor || '',
          landingPageTextColor: data.landingPageTextColor || '',
          landingPagePriority: data.landingPagePriority || 0
        } as LandingPage;
        setLandingPage(normalized);
      }
    } catch (error) {
      console.error('Failed to fetch landing page:', error);
      toast.error('Failed to load landing page');
    } finally {
      setLandingPageLoading(false);
    }
  };

  const saveLandingPage = async () => {
    try {
      const pageToSave = editingLandingPage || landingPage;

      // Validate required fields
      const errors: { [key: string]: string } = {};
      if (!pageToSave.landingPageTitle || pageToSave.landingPageTitle.trim() === '') {
        errors['title'] = 'Title is required';
      }
      if (!pageToSave.landingPageSubtitle || pageToSave.landingPageSubtitle.trim() === '') {
        errors['subtitle'] = 'Subtitle is required';
      }
      if (!pageToSave.landingPageButtonText || pageToSave.landingPageButtonText.trim() === '') {
        errors['button'] = 'Button text is required';
      }
      // Validate based on mode
      if (pageToSave.landingPageBackgroundMode === 'IMAGE' && !pageToSave.landingPageBackgroundImage) {
        errors['image'] = 'Background image is required for IMAGE mode';
      }
      if (pageToSave.landingPageBackgroundMode === 'VIDEO' && !pageToSave.landingPageVideoUrl) {
        errors['video'] = 'Video URL is required for VIDEO mode';
      }

      if (Object.keys(errors).length > 0) {
        setLandingPageErrors(errors);
        toast.error('Please fill in all required landing page fields');
        return;
      }

      setLandingPageErrors({});

      const payload = {
        ...pageToSave,
        landingPageLinkText: pageToSave.landingPageLinkText || null,
        landingPageLinkUrl: pageToSave.landingPageLinkUrl || null,
        landingPageStartDate: pageToSave.landingPageStartDate || null,
        landingPageEndDate: pageToSave.landingPageEndDate || null,
        landingPageBgColor: pageToSave.landingPageBgColor || null,
        landingPageTextColor: pageToSave.landingPageTextColor || null,
      };

      await apiRequest(
        API_ENDPOINTS.DASHBOARD.UPDATE_LANDING_PAGE,
        {
          method: 'POST',
          body: payload,
          requireAuth: true
        }
      );
      toast.success('Landing page updated successfully!');
      if (editingLandingPage) {
        setLandingPage(editingLandingPage);
      }
      setEditingLandingPage(null);
      // Refresh from server
      fetchLandingPage();
    } catch (error) {
      console.error('Failed to save landing page:', error);
      toast.error('Failed to save landing page');
    }
  };

  const handleLandingPageChange = (field: keyof LandingPage, value: any) => {
    if (editingLandingPage) {
      setEditingLandingPage({ ...editingLandingPage, [field]: value });
    }
  };

  const handleLandingPageVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLandingPageUploading(true);
    const videoUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (videoUrl) {
      handleLandingPageChange('landingPageVideoUrl', videoUrl);
      toast.success('Video uploaded');
    }
  };

  const handleLandingPageVideoDragDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragLandingVideo(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) {
      toast.error('Please drop a video file');
      return;
    }

    setLandingPageUploading(true);
    const videoUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (videoUrl) {
      handleLandingPageChange('landingPageVideoUrl', videoUrl);
      toast.success('Video uploaded');
    }
  };

  const handleLandingPageBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLandingPageUploading(true);
    const imageUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (imageUrl) {
      handleLandingPageChange('landingPageBackgroundImage', imageUrl);
      toast.success('Background image uploaded');
    }
  };

  const handleLandingPageBackgroundImageDragDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragLandingFallback(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    setLandingPageUploading(true);
    const imageUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (imageUrl) {
      handleLandingPageChange('landingPageBackgroundImage', imageUrl);
      toast.success('Background image uploaded');
    }
  };

  // Legacy handlers - kept for backwards compatibility
  const handleLandingPageFallbackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLandingPageUploading(true);
    const imageUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (imageUrl) {
      handleLandingPageChange('landingPageBackgroundImage', imageUrl);
      toast.success('Fallback image uploaded');
    }
  };

  const handleLandingPageFallbackDragDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragLandingFallback(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }

    setLandingPageUploading(true);
    const imageUrl = await uploadImage(file);
    setLandingPageUploading(false);

    if (imageUrl) {
      handleLandingPageChange('landingPageBackgroundImage', imageUrl);
      toast.success('Fallback image uploaded');
    }
  };

  // Reusable Image Upload Component
  const ImageUploadField = ({
    value,
    onChange,
    onUpload,
    isUploading,
    dragId,
    onDragEnter,
    onDragLeave,
    onDragDrop,
    label = 'Image'
  }: {
    value: string;
    onChange: (url: string) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
    dragId: string | boolean;
    onDragEnter: () => void;
    onDragLeave: () => void;
    onDragDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    label?: string;
  }) => {
    // Generate a stable ID for this component instance
    const uploadId = React.useMemo(() => `upload-${Math.random().toString(36).substr(2, 9)}`, []);
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        
        {/* Drag & Drop Zone */}
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDragDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={isUploading}
            className="hidden"
            id={uploadId}
          />
          <label htmlFor={uploadId} className="cursor-pointer block">
            <Upload className="w-5 h-5 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">
              {isUploading ? 'Uploading...' : 'Drag & drop image or click to upload'}
            </p>
          </label>
        </div>

        {/* Image URL Input */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Or paste image URL:</label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isUploading}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        {/* Image Preview */}
        {value && (
          <div className="relative w-full h-40 rounded-md overflow-hidden border bg-gray-100">
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', value);
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"%3E%3Cpath stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2.586 15.356l-2.11 2.11a1.89 1.89 0 0 0 2.67 2.67l2.11-2.11m0-4.242l-2.11-2.11a1.89 1.89 0 1 1 2.67-2.67l2.11 2.11m4.242 0l2.11 2.11a1.89 1.89 0 0 0 2.67-2.67l-2.11-2.11m0 4.242l2.11 2.11a1.89 1.89 0 1 1-2.67 2.67l-2.11-2.11"/%3E%3C/svg%3E';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const VideoUploadField = ({
    value,
    onChange,
    onUpload,
    isUploading,
    dragId,
    onDragEnter,
    onDragLeave,
    onDragDrop,
    label = 'Video'
  }: {
    value: string;
    onChange: (url: string) => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
    dragId: string | boolean;
    onDragEnter: () => void;
    onDragLeave: () => void;
    onDragDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    label?: string;
  }) => {
    const uploadId = React.useMemo(() => `video-upload-${Math.random().toString(36).substr(2, 9)}`, []);
    
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        
        {/* Drag & Drop Zone */}
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDragDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            accept="video/*"
            onChange={onUpload}
            disabled={isUploading}
            className="hidden"
            id={uploadId}
          />
          <label htmlFor={uploadId} className="cursor-pointer block">
            <Upload className="w-5 h-5 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-600">
              {isUploading ? 'Uploading...' : 'Drag & drop video or click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">MP4, WebM, or Ogg format (max 100MB)</p>
          </label>
        </div>

        {/* Video URL Input */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Or paste video URL:</label>
          <input
            type="url"
            placeholder="https://example.com/video.mp4"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isUploading}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
        </div>

        {/* Video Preview */}
        {value && (
          <div className="relative bg-black rounded-md overflow-hidden border">
            <video
              src={value}
              controls
              className="w-full max-h-40"
              onError={(e) => {
                console.error('Video failed to load:', value);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Manager</h1>
        <p className="text-gray-600 mt-2">Manage all homepage hero slides, highlight cards, promotional banners, and announcements</p>
      </div>

      {/* ===== ANNOUNCEMENT BAR SECTION ===== */}
      <AnnouncementManager />

      {/* ===== HERO SLIDES SECTION ===== */}
      <section className={commonClasses.card}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hero Carousel Slides</h2>
            <p className="text-sm text-gray-500 mt-1">Manage the main carousel slides displayed at the top of the homepage</p>
          </div>
          <Button
            onClick={addNewSlide}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Slide
          </Button>
        </div>

        {heroLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6">
              {heroSlides.map((slide) => (
                <div key={slide.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  {editingSlide?.id === slide.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alt Text <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Describe the image (for accessibility)"
                          value={editingSlide?.alt ?? ''}
                          onChange={(e) => handleSlideChange('alt', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingSlide && heroErrors[editingSlide.id] ? 'border-red-400 focus:ring-red-300' : ''}`}
                        />
                        {editingSlide && heroErrors[editingSlide.id] ? (
                          <p className="text-xs text-red-500 mt-1">{heroErrors[editingSlide.id]}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Required. Improves accessibility and SEO.</p>
                        )}
                      </div>

                      <ImageUploadField
                        value={editingSlide?.image ?? ''}
                        onChange={(url) => handleSlideChange('image', url)}
                        onUpload={(e) => handleHeroUpload(e, slide.id)}
                        isUploading={heroUploading}
                        dragId={dragHeroId === slide.id ? true : false}
                        onDragEnter={() => setDragHeroId(slide.id)}
                        onDragLeave={() => setDragHeroId(null)}
                        onDragDrop={(e) => handleHeroDragDrop(e, slide.id)}
                        label="Slide Image *"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          placeholder="Additional details about the slide"
                          value={editingSlide?.description ?? ''}
                          onChange={(e) => handleSlideChange('description', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={saveHeroSlides}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2"
                          disabled={heroUploading || (!!editingSlide && (!editingSlide.image || !editingSlide.alt || editingSlide.image.toString().trim() === '' || editingSlide.alt.toString().trim() === '')) || Object.keys(heroErrors).length > 0}
                        >
                          <Save className="w-4 h-4" /> Save
                        </Button>
                        <Button
                          onClick={() => setEditingSlide(null)}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0 border">
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={slide.alt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{slide.alt || 'Untitled'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{slide.description}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => startEditSlide(slide)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => removeSlide(slide.id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ===== HIGHLIGHT CARDS SECTION ===== */}
      <section className={commonClasses.card}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Highlight Cards (4 Featured Sections)</h2>
            <p className="text-sm text-gray-500 mt-1">These cards appear in the "This Week's Highlight" section with asymmetric layout</p>
          </div>
          {highlightCards.length < 4 && (
            <Button
              onClick={addNewCard}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Card
            </Button>
          )}
        </div>

        {cardsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6">
              {highlightCards.map((card) => (
                <div key={card.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  {editingCard?.id === card.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Exclusive Collection, Summer Sale"
                          value={editingCard?.title ?? ''}
                          onChange={(e) => handleCardChange('title', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingCard && cardErrors[editingCard.id] ? 'border-red-400 focus:ring-red-300' : ''}`}
                        />
                        {editingCard && cardErrors[editingCard.id] ? (
                          <p className="text-xs text-red-500 mt-1">{cardErrors[editingCard.id]}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Required field. Will be displayed on the dashboard.</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Card Description
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 20% off all items, Limited time offer"
                          value={editingCard?.description ?? ''}
                          onChange={(e) => handleCardChange('description', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional. Displayed below the title on the card overlay.</p>
                      </div>

                      <ImageUploadField
                        value={editingCard?.image ?? ''}
                        onChange={(url) => handleCardChange('image', url)}
                        onUpload={(e) => handleCardUpload(e, card.id)}
                        isUploading={cardUploading}
                        dragId={dragCardId === card.id ? true : false}
                        onDragEnter={() => setDragCardId(card.id)}
                        onDragLeave={() => setDragCardId(null)}
                        onDragDrop={(e) => handleCardDragDrop(e, card.id)}
                        label="Card Background Image"
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={saveHighlightCards}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2"
                          disabled={cardUploading || (!!editingCard && (!editingCard.title || editingCard.title.trim() === '')) || Object.keys(cardErrors).length > 0}
                        >
                          <Save className="w-4 h-4" /> Save Changes
                        </Button>
                        <Button
                          onClick={() => setEditingCard(null)}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-6">
                      <div className="w-32 h-32 rounded overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-300">
                        {card.image && card.image.trim() ? (
                          <img
                            src={card.image}
                            alt={card.title || 'Card image'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', card.image);
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Crect fill="%23f3f4f6" width="24" height="24"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%239ca3af"%3E✕%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 bg-gray-50">No image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {card.title && card.title.trim() ? card.title : <span className="text-gray-400 italic">Untitled Card</span>}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {card.description && card.description.trim() ? card.description : <span className="text-gray-400 italic">No description</span>}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => startEditCard(card)}
                            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => removeCard(card.id)}
                            className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors flex items-center gap-2 font-medium"
                          >
                            <X className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ===== SUMMER BANNER SECTION ===== */}
      <section className={commonClasses.card}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Summer Collection Banner</h2>
            <p className="text-sm text-gray-500 mt-1">Promotional banner with countdown timer displayed mid-page</p>
          </div>
          <Button
            onClick={() => setEditingBanner(summerBanner)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Button>
        </div>

        {bannerLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {editingBanner ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingBanner.summerBannerTitle}
                    onChange={(e) => handleBannerChange('summerBannerTitle', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${bannerErrors['title'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  {bannerErrors['title'] ? (
                    <p className="text-xs text-red-500 mt-1">{bannerErrors['title']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. Main heading for the banner.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editingBanner.summerBannerDescription}
                    onChange={(e) => handleBannerChange('summerBannerDescription', e.target.value)}
                    placeholder="e.g., Limited time offer - Don't miss out!"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${bannerErrors['description'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                    rows={2}
                  />
                  {bannerErrors['description'] ? (
                    <p className="text-xs text-red-500 mt-1">{bannerErrors['description']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. Subtitle/description shown below the main title.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingBanner.summerBannerButtonText}
                    onChange={(e) => handleBannerChange('summerBannerButtonText', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${bannerErrors['button'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  {bannerErrors['button'] ? (
                    <p className="text-xs text-red-500 mt-1">{bannerErrors['button']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. Text displayed on the CTA button.</p>
                  )}
                </div>

                <ImageUploadField
                  value={editingBanner.summerBannerBackgroundImage}
                  onChange={(url) => handleBannerChange('summerBannerBackgroundImage', url)}
                  onUpload={handleBannerUpload}
                  isUploading={bannerUploading}
                  dragId={dragBanner}
                  onDragEnter={() => setDragBanner(true)}
                  onDragLeave={() => setDragBanner(false)}
                  onDragDrop={handleBannerDragDrop}
                  label="Background Image *"
                />
                {bannerErrors['image'] && (
                  <p className="text-xs text-red-500">{bannerErrors['image']}</p>
                )}

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Days</label>
                    <input
                      type="number"
                      value={editingBanner.summerBannerCountdownDays}
                      onChange={(e) => handleBannerChange('summerBannerCountdownDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                    <input
                      type="number"
                      value={editingBanner.summerBannerCountdownHours}
                      onChange={(e) => handleBannerChange('summerBannerCountdownHours', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minutes</label>
                    <input
                      type="number"
                      value={editingBanner.summerBannerCountdownMinutes}
                      onChange={(e) => handleBannerChange('summerBannerCountdownMinutes', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seconds</label>
                    <input
                      type="number"
                      value={editingBanner.summerBannerCountdownSeconds}
                      onChange={(e) => handleBannerChange('summerBannerCountdownSeconds', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Link Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Text (optional)</label>
                    <input
                      type="text"
                      value={editingBanner.summerBannerLinkText || ''}
                      onChange={(e) => handleBannerChange('summerBannerLinkText', e.target.value)}
                      placeholder="e.g., Shop Now, View Collection"
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
                    <input
                      type="text"
                      value={editingBanner.summerBannerLinkUrl || ''}
                      onChange={(e) => handleBannerChange('summerBannerLinkUrl', e.target.value)}
                      placeholder="e.g., /products?category=summer"
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={editingBanner.summerBannerStartDate || ''}
                      onChange={(e) => handleBannerChange('summerBannerStartDate', e.target.value || null)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to show immediately</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={editingBanner.summerBannerEndDate || ''}
                      onChange={(e) => handleBannerChange('summerBannerEndDate', e.target.value || null)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
                  </div>
                </div>

                {/* Custom Colors & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingBanner.summerBannerBgColor || '#000000'}
                        onChange={(e) => handleBannerChange('summerBannerBgColor', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingBanner.summerBannerBgColor || ''}
                        onChange={(e) => handleBannerChange('summerBannerBgColor', e.target.value)}
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Overlay/accent color override</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingBanner.summerBannerTextColor || '#ffffff'}
                        onChange={(e) => handleBannerChange('summerBannerTextColor', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingBanner.summerBannerTextColor || ''}
                        onChange={(e) => handleBannerChange('summerBannerTextColor', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Banner text color override</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      value={editingBanner.summerBannerPriority}
                      onChange={(e) => handleBannerChange('summerBannerPriority', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher = shown first</p>
                  </div>
                </div>

                {/* Banner Preview */}
                {(editingBanner.summerBannerBgColor || editingBanner.summerBannerTextColor) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Preview</label>
                    <div
                      className="rounded-lg px-4 py-3 text-sm font-medium text-center"
                      style={{
                        backgroundColor: editingBanner.summerBannerBgColor || '#000000',
                        color: editingBanner.summerBannerTextColor || '#ffffff',
                      }}
                    >
                      <span className="font-bold">{editingBanner.summerBannerTitle || 'Banner Title'}</span>
                      <span className="ml-2">{editingBanner.summerBannerDescription || 'Description text'}</span>
                      {editingBanner.summerBannerLinkText && (
                        <span className="ml-2 underline font-semibold">{editingBanner.summerBannerLinkText}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={saveSummerBanner}
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={bannerUploading || !editingBanner.summerBannerTitle.trim() || !editingBanner.summerBannerDescription.trim() || !editingBanner.summerBannerButtonText.trim() || !editingBanner.summerBannerBackgroundImage.toString().trim() || Object.keys(bannerErrors).length > 0}
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </Button>
                  <Button
                    onClick={() => setEditingBanner(null)}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <p><strong>Title:</strong> {summerBanner.summerBannerTitle}</p>
                <p><strong>Description:</strong> {summerBanner.summerBannerDescription}</p>
                <p><strong>Button:</strong> {summerBanner.summerBannerButtonText}</p>
                <p><strong>Countdown:</strong> {summerBanner.summerBannerCountdownDays}d {summerBanner.summerBannerCountdownHours}h {summerBanner.summerBannerCountdownMinutes}m {summerBanner.summerBannerCountdownSeconds}s</p>
                {summerBanner.summerBannerLinkText && (
                  <p><strong>Link:</strong> {summerBanner.summerBannerLinkText} → {summerBanner.summerBannerLinkUrl || '(no URL)'}</p>
                )}
                {(summerBanner.summerBannerStartDate || summerBanner.summerBannerEndDate) && (
                  <p className="text-sm text-gray-500">
                    <strong>Schedule:</strong>{' '}
                    {summerBanner.summerBannerStartDate && `From: ${new Date(summerBanner.summerBannerStartDate).toLocaleDateString()}`}
                    {summerBanner.summerBannerStartDate && summerBanner.summerBannerEndDate && ' — '}
                    {summerBanner.summerBannerEndDate && `To: ${new Date(summerBanner.summerBannerEndDate).toLocaleDateString()}`}
                  </p>
                )}
                {(summerBanner.summerBannerBgColor || summerBanner.summerBannerTextColor) && (
                  <div className="flex items-center gap-3">
                    <strong className="text-sm">Colors:</strong>
                    {summerBanner.summerBannerBgColor && (
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: summerBanner.summerBannerBgColor }} />
                        <span className="text-xs text-gray-500">BG</span>
                      </div>
                    )}
                    {summerBanner.summerBannerTextColor && (
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: summerBanner.summerBannerTextColor }} />
                        <span className="text-xs text-gray-500">Text</span>
                      </div>
                    )}
                  </div>
                )}
                {summerBanner.summerBannerPriority > 0 && (
                  <p className="text-sm"><strong>Priority:</strong> {summerBanner.summerBannerPriority}</p>
                )}
                {summerBanner.summerBannerBackgroundImage && (
                  <div className="mt-4">
                    <img
                      src={summerBanner.summerBannerBackgroundImage}
                      alt="Summer banner preview"
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== LANDING PAGE SECTION ===== */}
      <section className={commonClasses.card}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Landing Page Hero Section</h2>
            <p className="text-sm text-gray-500 mt-1">Customize the landing page with static or video background</p>
          </div>
          <Button
            onClick={() => setEditingLandingPage(landingPage)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Button>
        </div>

        {landingPageLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {editingLandingPage ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingLandingPage.landingPageTitle}
                    onChange={(e) => handleLandingPageChange('landingPageTitle', e.target.value)}
                    placeholder="e.g., Welcome to The Babel Edit"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${landingPageErrors['title'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  {landingPageErrors['title'] ? (
                    <p className="text-xs text-red-500 mt-1">{landingPageErrors['title']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. Main heading displayed over the video.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingLandingPage.landingPageSubtitle}
                    onChange={(e) => handleLandingPageChange('landingPageSubtitle', e.target.value)}
                    placeholder="e.g., Discover Premium Fashion & Lifestyle"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${landingPageErrors['subtitle'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  {landingPageErrors['subtitle'] ? (
                    <p className="text-xs text-red-500 mt-1">{landingPageErrors['subtitle']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. Tagline shown below the title.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingLandingPage.landingPageButtonText}
                    onChange={(e) => handleLandingPageChange('landingPageButtonText', e.target.value)}
                    placeholder="e.g., Shop Now"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${landingPageErrors['button'] ? 'border-red-400 focus:ring-red-300' : ''}`}
                  />
                  {landingPageErrors['button'] ? (
                    <p className="text-xs text-red-500 mt-1">{landingPageErrors['button']}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Required. CTA button label.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Button Link</label>
                  <input
                    type="text"
                    value={editingLandingPage.landingPageButtonLink}
                    onChange={(e) => handleLandingPageChange('landingPageButtonLink', e.target.value)}
                    placeholder="e.g., /products or /dashboard"
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Where the button links to when clicked.</p>
                </div>

                <div>
                  <fieldset className="border border-gray-300 rounded-md p-4 mb-4">
                    <legend className="text-sm font-medium text-gray-700 px-2">Background Type Mode</legend>
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mode-none"
                          name="backgroundMode"
                          value="NONE"
                          checked={editingLandingPage.landingPageBackgroundMode === 'NONE'}
                          onChange={() => handleLandingPageChange('landingPageBackgroundMode', 'NONE')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="mode-none" className="ml-2 text-sm text-gray-700">
                          <strong>Option 1: None</strong> - Plain color/gradient (default)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mode-image"
                          name="backgroundMode"
                          value="IMAGE"
                          checked={editingLandingPage.landingPageBackgroundMode === 'IMAGE'}
                          onChange={() => handleLandingPageChange('landingPageBackgroundMode', 'IMAGE')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="mode-image" className="ml-2 text-sm text-gray-700">
                          <strong>Option 2: Static Image</strong> - Background image hero section
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mode-video"
                          name="backgroundMode"
                          value="VIDEO"
                          checked={editingLandingPage.landingPageBackgroundMode === 'VIDEO'}
                          onChange={() => handleLandingPageChange('landingPageBackgroundMode', 'VIDEO')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="mode-video" className="ml-2 text-sm text-gray-700">
                          <strong>Option 3: Dynamic Video</strong> - Full-screen background video with fallback image
                        </label>
                      </div>
                    </div>
                  </fieldset>
                </div>

                {editingLandingPage.landingPageBackgroundMode === 'IMAGE' && (
                  <ImageUploadField
                    value={editingLandingPage.landingPageBackgroundImage}
                    onChange={(url) => handleLandingPageChange('landingPageBackgroundImage', url)}
                    onUpload={(e) => handleLandingPageBackgroundImageUpload(e)}
                    isUploading={landingPageUploading}
                    dragId={dragLandingFallback}
                    onDragEnter={() => setDragLandingFallback(true)}
                    onDragLeave={() => setDragLandingFallback(false)}
                    onDragDrop={handleLandingPageBackgroundImageDragDrop}
                    label="Background Image"
                  />
                )}

                {editingLandingPage.landingPageBackgroundMode === 'VIDEO' && (
                  <>
                    <VideoUploadField
                      value={editingLandingPage.landingPageVideoUrl}
                      onChange={(url) => handleLandingPageChange('landingPageVideoUrl', url)}
                      onUpload={handleLandingPageVideoUpload}
                      isUploading={landingPageUploading}
                      dragId={dragLandingVideo}
                      onDragEnter={() => setDragLandingVideo(true)}
                      onDragLeave={() => setDragLandingVideo(false)}
                      onDragDrop={handleLandingPageVideoDragDrop}
                      label="Background Video (Primary)"
                    />

                    <ImageUploadField
                      value={editingLandingPage.landingPageBackgroundImage}
                      onChange={(url) => handleLandingPageChange('landingPageBackgroundImage', url)}
                      onUpload={(e) => handleLandingPageBackgroundImageUpload(e)}
                      isUploading={landingPageUploading}
                      dragId={dragLandingFallback}
                      onDragEnter={() => setDragLandingFallback(true)}
                      onDragLeave={() => setDragLandingFallback(false)}
                      onDragDrop={handleLandingPageBackgroundImageDragDrop}
                      label="Fallback Image (if video fails)"
                    />
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overlay Opacity (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editingLandingPage.landingPageOverlayOpacity}
                    onChange={(e) => handleLandingPageChange('landingPageOverlayOpacity', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Darkness of overlay: {editingLandingPage.landingPageOverlayOpacity}% (0=transparent, 100=opaque)</p>
                </div>

                {/* Link Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Text (optional)</label>
                    <input
                      type="text"
                      value={editingLandingPage.landingPageLinkText || ''}
                      onChange={(e) => handleLandingPageChange('landingPageLinkText', e.target.value)}
                      placeholder="e.g., Explore More, Learn More"
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
                    <input
                      type="text"
                      value={editingLandingPage.landingPageLinkUrl || ''}
                      onChange={(e) => handleLandingPageChange('landingPageLinkUrl', e.target.value)}
                      placeholder="e.g., /about or /products?new=true"
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={editingLandingPage.landingPageStartDate || ''}
                      onChange={(e) => handleLandingPageChange('landingPageStartDate', e.target.value || null)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to show immediately</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={editingLandingPage.landingPageEndDate || ''}
                      onChange={(e) => handleLandingPageChange('landingPageEndDate', e.target.value || null)}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
                  </div>
                </div>

                {/* Custom Colors & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingLandingPage.landingPageBgColor || '#000000'}
                        onChange={(e) => handleLandingPageChange('landingPageBgColor', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingLandingPage.landingPageBgColor || ''}
                        onChange={(e) => handleLandingPageChange('landingPageBgColor', e.target.value)}
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Overlay/accent color override</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingLandingPage.landingPageTextColor || '#ffffff'}
                        onChange={(e) => handleLandingPageChange('landingPageTextColor', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingLandingPage.landingPageTextColor || ''}
                        onChange={(e) => handleLandingPageChange('landingPageTextColor', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hero text color override</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      value={editingLandingPage.landingPagePriority}
                      onChange={(e) => handleLandingPageChange('landingPagePriority', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher = shown first</p>
                  </div>
                </div>

                {/* Hero Preview */}
                {(editingLandingPage.landingPageBgColor || editingLandingPage.landingPageTextColor) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Preview</label>
                    <div
                      className="rounded-lg px-4 py-3 text-sm font-medium text-center"
                      style={{
                        backgroundColor: editingLandingPage.landingPageBgColor || '#000000',
                        color: editingLandingPage.landingPageTextColor || '#ffffff',
                      }}
                    >
                      <span className="font-bold text-lg">{editingLandingPage.landingPageTitle || 'Hero Title'}</span>
                      <br />
                      <span>{editingLandingPage.landingPageSubtitle || 'Subtitle text'}</span>
                      {editingLandingPage.landingPageLinkText && (
                        <span className="ml-2 underline font-semibold">{editingLandingPage.landingPageLinkText}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={saveLandingPage}
                    variant="primary"
                    className="flex items-center gap-2"
                    disabled={
                      landingPageUploading ||
                      !editingLandingPage.landingPageTitle.trim() ||
                      !editingLandingPage.landingPageSubtitle.trim() ||
                      !editingLandingPage.landingPageButtonText.trim() ||
                      (editingLandingPage.landingPageBackgroundMode === 'IMAGE' && !editingLandingPage.landingPageBackgroundImage) ||
                      (editingLandingPage.landingPageBackgroundMode === 'VIDEO' && !editingLandingPage.landingPageVideoUrl) ||
                      Object.keys(landingPageErrors).length > 0
                    }
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </Button>
                  <Button
                    onClick={() => setEditingLandingPage(null)}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm font-medium text-blue-900">
                    {landingPage.landingPageBackgroundMode === 'NONE' && '✅ Option 1: Default Gradient (NONE)'}
                    {landingPage.landingPageBackgroundMode === 'IMAGE' && '✅ Option 2: Static Image Background'}
                    {landingPage.landingPageBackgroundMode === 'VIDEO' && '✅ Option 3: Dynamic Video Background'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Title</p>
                    <p className="text-gray-900">{landingPage.landingPageTitle}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Subtitle</p>
                    <p className="text-gray-900">{landingPage.landingPageSubtitle}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Button Text</p>
                    <p className="text-gray-900">{landingPage.landingPageButtonText}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Button Link</p>
                    <p className="text-gray-900">{landingPage.landingPageButtonLink}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 font-medium text-sm mb-2">Overlay Opacity</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-300 rounded" style={{ background: `linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,${landingPage.landingPageOverlayOpacity / 100}))` }}></div>
                    <span className="text-sm text-gray-900 font-medium w-8 text-right">{landingPage.landingPageOverlayOpacity}%</span>
                  </div>
                </div>
                {landingPage.landingPageBackgroundMode === 'IMAGE' && landingPage.landingPageBackgroundImage && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">🖼️ Background Image</p>
                    <img
                      src={landingPage.landingPageBackgroundImage}
                      alt="Background"
                      className="w-full h-40 object-cover rounded border border-gray-300"
                    />
                  </div>
                )}
                {landingPage.landingPageBackgroundMode === 'VIDEO' && (
                  <>
                    {landingPage.landingPageVideoUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">🎬 Video Background (Primary)</p>
                        <div className="rounded overflow-hidden bg-black border border-gray-300">
                          <video
                            src={landingPage.landingPageVideoUrl}
                            controls
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {landingPage.landingPageBackgroundImage && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">🖼️ Fallback Image (if video fails)</p>
                        <img
                          src={landingPage.landingPageBackgroundImage}
                          alt="Fallback"
                          className="w-full h-40 object-cover rounded border border-gray-300"
                        />
                      </div>
                    )}
                  </>
                )}
                {landingPage.landingPageLinkText && (
                  <p className="text-sm mt-2"><strong>Link:</strong> {landingPage.landingPageLinkText} → {landingPage.landingPageLinkUrl || '(no URL)'}</p>
                )}
                {(landingPage.landingPageStartDate || landingPage.landingPageEndDate) && (
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Schedule:</strong>{' '}
                    {landingPage.landingPageStartDate && `From: ${new Date(landingPage.landingPageStartDate).toLocaleDateString()}`}
                    {landingPage.landingPageStartDate && landingPage.landingPageEndDate && ' — '}
                    {landingPage.landingPageEndDate && `To: ${new Date(landingPage.landingPageEndDate).toLocaleDateString()}`}
                  </p>
                )}
                {(landingPage.landingPageBgColor || landingPage.landingPageTextColor) && (
                  <div className="flex items-center gap-3 mt-2">
                    <strong className="text-sm">Colors:</strong>
                    {landingPage.landingPageBgColor && (
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: landingPage.landingPageBgColor }} />
                        <span className="text-xs text-gray-500">BG</span>
                      </div>
                    )}
                    {landingPage.landingPageTextColor && (
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: landingPage.landingPageTextColor }} />
                        <span className="text-xs text-gray-500">Text</span>
                      </div>
                    )}
                  </div>
                )}
                {landingPage.landingPagePriority > 0 && (
                  <p className="text-sm mt-1"><strong>Priority:</strong> {landingPage.landingPagePriority}</p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== CONFIRMATION MODAL ===== */}
      {confirmDelete.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Delete {confirmDelete.type === 'slide' ? 'Hero Slide' : 'Highlight Card'}?
                </h3>
                <p className="text-sm text-gray-600">"{confirmDelete.name}"</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">This action cannot be undone. Are you sure you want to proceed?</p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete({ type: null, id: null, name: '' })}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-md font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'slide') confirmRemoveSlide();
                  else if (confirmDelete.type === 'card') confirmRemoveCard();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardManager;
