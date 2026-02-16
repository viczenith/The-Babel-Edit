'use client'
import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchInput.module.css';

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Enhanced Search Input Props
interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  showClearButton?: boolean;
  minSearchLength?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
  isLoading = false,
  className = '',
  disabled = false,
  showClearButton = true,
  minSearchLength = 0,
}) => {
  const [query, setQuery] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);

  // Keep the ref up to date with the latest callback
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Trigger search when debounced query changes, but only after user interaction
  useEffect(() => {
    if (!hasInteracted) return; // Don't search on mount/initial render
    
    if (debouncedQuery.length >= minSearchLength) {
      onSearchRef.current(debouncedQuery);
    } else if (debouncedQuery.length === 0) {
      onSearchRef.current(''); // Clear results when input is empty
    }
  }, [debouncedQuery, minSearchLength, hasInteracted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasInteracted) setHasInteracted(true);
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasInteracted) setHasInteracted(true);
    if (e.key === 'Escape') {
      handleClear();
    } else if (e.key === 'Enter') {
      // Force search on Enter, even if below minimum length
      onSearch(query);
    }
  };

  return (
    <div className={`${styles.searchContainer} ${className}`}>
      <div className={styles.searchInputWrapper}>
        {/* Search Icon */}
        <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
          <path 
            fillRule="evenodd" 
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
            clipRule="evenodd" 
          />
        </svg>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`${styles.searchInput} ${disabled || isLoading ? styles.disabled : ''}`}
          autoComplete="off"
          spellCheck="false"
          aria-label="Search"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <svg className={styles.spinner} viewBox="0 0 24 24">
              <circle 
                className={styles.spinnerCircle} 
                cx="12" 
                cy="12" 
                r="10" 
                fill="none" 
                strokeWidth="2"
              />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {showClearButton && query && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path 
                fillRule="evenodd" 
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchInput;