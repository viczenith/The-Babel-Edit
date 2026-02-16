'use client';

import React from 'react';
import styles from './ArrowButton.module.css';

interface ArrowButtonProps {
    direction: 'left' | 'right';
    onClick: () => void;
    className?: string;
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ direction, onClick, className = '' }) => {
    return (
        <button 
            className={`${styles.arrowButton} ${styles[direction]} ${className}`}
            onClick={onClick}
            aria-label={`Scroll ${direction}`}
        >
            {direction === 'left' ? '←' : '→'}
        </button>
    );
};

export default ArrowButton; 