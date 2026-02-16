'use client';

import React, { forwardRef } from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  label,
  id,
  error,
  helperText,
  required = false,
  children,
  className = '',
}, ref) => {
  return (
    <div ref={ref} className={className}>
      <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-2">
        {children}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;
