'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmButton: 'danger' as const,
    },
    warning: {
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      confirmButton: 'primary' as const,
    },
    info: {
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmButton: 'primary' as const,
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${styles.iconBg} mb-4`}>
          <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex space-x-3 justify-center">
          <Button
            onClick={onClose}
            variant="ghost"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={styles.confirmButton}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
