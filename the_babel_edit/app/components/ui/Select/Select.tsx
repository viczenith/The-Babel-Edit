'use client';

import React from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  value = '',
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  className = '',
  id,
  name,
  required = false,
  'aria-label': ariaLabel,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const selectClasses = [
    styles.select,
    error ? styles.error : '',
    disabled ? styles.disabled : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={selectClasses}
        aria-label={ariaLabel}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;