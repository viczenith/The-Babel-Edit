import React from 'react';
import Link from 'next/link';
import styles from './ModernProductCard.module.css';
import { useParams } from 'next/navigation';
import Image from 'next/image';
interface ModernProductCardProps {
  id?: string | number;
  imageSrc: string;
  imageAlt: string;
  title: string;
  price: number | string;
  originalPrice?: number | string;
  orders?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}

const ModernProductCard: React.FC<ModernProductCardProps> = ({
  id,
  imageSrc,
  imageAlt,
  title,
  price,
  originalPrice,
  orders,
  isFavorite = false,
  onFavoriteToggle,
}) => {
  const params = useParams();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.();
  };

  return (
    <Link href={`/${typeof params.locale === 'string' ? params.locale : 'en'}/products/${id || '1'}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          {imageSrc && imageSrc.trim() ? (
            <Image
              src={imageSrc}
              alt={imageAlt || 'Product image'}
              className={styles.image}
              width={300}
              height={300}
              quality={75}
            />
          ) : (
            <div className={`${styles.image} bg-gray-200 flex items-center justify-center`}>
              <span className="text-gray-400">No image</span>
            </div>
          )}
          <button className={styles.favoriteBtn} onClick={handleFavoriteClick} aria-label="Add to favorites">
            {isFavorite ? (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 29s-11-7.434-11-15.364C5 7.477 9.477 3 14.636 3c2.13 0 4.164 1.01 5.364 2.636C21.2 4.01 23.234 3 25.364 3 30.523 3 35 7.477 35 13.636 35 21.566 24 29 24 29H16z" fill="#e74c3c" stroke="#fff" strokeWidth="2" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" fill="none" />
                <path d="M23.364 5C26.97 5 30 8.03 30 12.09c0 6.13-8.13 12.13-12.36 15.01a2 2 0 0 1-2.28 0C10.13 24.22 2 18.22 2 12.09 2 8.03 5.03 5 8.636 5c2.13 0 4.164 1.01 5.364 2.636C15.2 6.01 17.234 5 19.364 5z" stroke="#fff" strokeWidth="2" fill="rgba(34,34,34,0.4)" />
              </svg>
            )}
          </button>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.title}>{title}</div>
          <div className={styles.row}>
            <span className={styles.price}>${price}</span>
            {orders !== undefined && (
              <span className={styles.orders}>{orders} Orders</span>
            )}
          </div>
          {originalPrice && (
            <div className={styles.originalPrice}>${originalPrice}</div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ModernProductCard; 