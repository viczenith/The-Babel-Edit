'use client';
import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  setLoading: (loading: boolean, message?: string) => void;
  clearLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  loadingMessage: undefined,
  setLoading: (loading: boolean, message?: string) => 
    set({ isLoading: loading, loadingMessage: message }),
  clearLoading: () => 
    set({ isLoading: false, loadingMessage: undefined }),
}));
