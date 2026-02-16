import React from 'react';
import styles from './ProductActions.module.css';

interface ProductActionsProps {
  onAddToCart: () => void;
  onAddToWishlist: () => void;
  isWishlisted: boolean;
}

const ProductActions: React.FC<ProductActionsProps> = ({ onAddToCart, onAddToWishlist, isWishlisted }) => {
  return (
    <div className={styles.actionsWrapper}>
      <button className={styles.addToCartBtn} onClick={onAddToCart} type="button">
        Add to Cart
      </button>
      <button className={styles.wishlistBtn} onClick={onAddToWishlist} type="button" aria-label="Add to wishlist">
        <span className={styles.heart}>{isWishlisted ? '❤️' : '🤍'}</span>
      </button>
    </div>
  );
};

export default ProductActions; 