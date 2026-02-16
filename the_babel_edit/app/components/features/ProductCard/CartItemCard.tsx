import React from 'react';
import Image from 'next/image';
import styles from './CartItemCard.module.css';
import { formatCurrency } from '@/lib/utils';

interface CartItemCardProps {
  image: string;
  title: string;
  size: string;
  color: string;
  price: number;
  onRemove: () => void;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ image, title, size, color, price, onRemove }) => {
  return (
    <div className={styles.cartItemCard}>
      <div className={styles.imageWrapper}>
        <Image src={image} alt={title} width={120} height={140} className={styles.image} />
      </div>
      <div className={styles.details}>
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>Size: {size} | Color: {color}</div>
        <div className={styles.price}>{formatCurrency(price)}</div>
        <button className={styles.remove} onClick={onRemove}>🗑 Remove</button>
      </div>
    </div>
  );
};

export default CartItemCard; 