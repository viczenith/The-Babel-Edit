'use client';
import React from 'react';
import { useLoadingStore } from '@/app/store';
import styles from './GlobalLoading.module.css';

const GlobalLoading = () => {
  const { isLoading, loadingMessage } = useLoadingStore();

  if (!isLoading) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.spinnerContainer}>
        <div className={styles.spinner}></div>
        {loadingMessage && <p className={styles.message}>{loadingMessage}</p>}
      </div>
    </div>
  );
};

export default GlobalLoading;

