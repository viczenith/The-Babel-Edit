import React from 'react';
import styles from './ProductOptions.module.css';

interface ProductOptionsProps {
  sizes: string[];
  colors: string[];
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onQuantityChange: (qty: number) => void;
}

const colorMap: Record<string, string> = {
  black: '#232323',
  red: '#ff2d17',
  green: '#3ad13a',
  white: '#fff',
  purple: '#4b2e83',
  blue: '#2d3aff',
};

const ProductOptions: React.FC<ProductOptionsProps> = ({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  quantity,
  onSizeChange,
  onColorChange,
  onQuantityChange,
}) => {
  return (
    <div className={styles.optionsWrapper}>
      <div className={styles.optionGroup}>
        <span className={styles.label}>Size:</span>
        <div className={styles.sizes}>
          {sizes.map((size) => (
            <button
              key={size}
              className={`${styles.sizeBtn} ${selectedSize === size ? styles.active : ''}`}
              onClick={() => onSizeChange(size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.optionGroup}>
        <span className={styles.label}>Color:</span>
        <div className={styles.colors}>
          {colors.map((color) => (
            <button
              key={color}
              className={`${styles.colorBtn} ${selectedColor === color ? styles.active : ''}`}
              style={{ background: colorMap[color] || color, borderColor: selectedColor === color ? '#232323' : '#e0e0e0' }}
              onClick={() => onColorChange(color)}
              type="button"
            />
          ))}
        </div>
      </div>
      <div className={styles.optionGroup}>
        <span className={styles.label} style={{marginRight: '1rem'}}> </span>
        <div className={styles.quantityWrapper}>
          <button className={styles.qtyBtn} onClick={() => onQuantityChange(Math.max(1, quantity - 1))} type="button">-</button>
          <span className={styles.qtyNum}>{quantity}</span>
          <button className={styles.qtyBtn} onClick={() => onQuantityChange(quantity + 1)} type="button">+</button>
        </div>
      </div>
    </div>
  );
};

export default ProductOptions; 