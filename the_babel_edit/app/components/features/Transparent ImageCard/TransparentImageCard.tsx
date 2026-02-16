'use client';
import React from 'react';
import styles from './TransparentImageCard.module.css';

export interface TransparentImageCardProps {
    backgroundImage: string;
    title: string;
    subtitle?: string;
    description?: string;
    overlayOpacity?: number;
    overlayColor?: string;
    width?: string;
    height?: string;
    className?: string;
    onClick?: () => void;
    href?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
}

const TransparentImageCard: React.FC<TransparentImageCardProps> = ({
    backgroundImage,
    title,
    subtitle,
    description,
    overlayOpacity = 0.7,
    overlayColor = '#000000',
    width = '300px',
    height = '400px',
    className = '',
    onClick,
    href,
    target = '_self'
}) => {
    const cardStyle = {
        backgroundImage: `url(${backgroundImage})`,
        width,
        height,
        '--overlay-color': overlayColor,
        '--overlay-opacity': overlayOpacity.toString()
    } as React.CSSProperties;

    const content = (
        <>
            <div className={styles.overlay} />
            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
            </div>
            {(subtitle || description) && (
                <div className={styles.subContent}>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    {description && <p className={styles.description}>{description}</p>}
                </div>
            )}
        </>
    );

    if (href) {
        return (
            <a
                href={href}
                target={target}
                className={`${styles.card} ${styles.cardLink} ${className}`}
                style={cardStyle}
                rel={target === '_blank' ? 'noopener noreferrer' : undefined}
            >
                {content}
            </a>
        );
    }

    return (
        <div
            className={`${styles.card} ${onClick ? styles.cardClickable : ''} ${className}`}
            style={cardStyle}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            } : undefined}
        >
            {content}
        </div>
    );
};

export default TransparentImageCard;