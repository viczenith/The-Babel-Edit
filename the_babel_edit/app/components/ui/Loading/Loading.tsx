import React from 'react';
import styles from './Loading.module.css';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export default function Loading({ 
  size = 'medium', 
  text = 'Loading...', 
  fullScreen = false,
  overlay = false 
}: LoadingProps) {
  const containerClass = `${styles.loadingContainer} ${styles[size]} ${
    fullScreen ? styles.fullScreen : ''
  } ${overlay ? styles.overlay : ''}`;

  return (
    <div className={containerClass}>
      <div className={styles.spinner}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
      {text && <p className={styles.loadingText}>{text}</p>}
    </div>
  );
}