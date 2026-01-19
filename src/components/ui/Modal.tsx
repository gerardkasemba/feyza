'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className 
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          'w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl dark:shadow-neutral-950/50 animate-slide-up',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Optional: Alert Modal variant for common use cases
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: 'default' | 'destructive' | 'success';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default'
}: AlertModalProps) {
  const variantStyles = {
    default: {
      button: 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600',
      icon: 'text-primary-600 dark:text-primary-500'
    },
    destructive: {
      button: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
      icon: 'text-red-600 dark:text-red-500'
    },
    success: {
      button: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
      icon: 'text-green-600 dark:text-green-500'
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{message}</p>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${variantStyles[variant].button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Optional: Loading Modal variant
interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export function LoadingModal({ isOpen, title = 'Loading', message = 'Please wait...' }: LoadingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="sm">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
      </div>
    </Modal>
  );
}

// Optional: Info Modal variant
interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function InfoModal({ isOpen, onClose, title, children, icon }: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col items-center text-center">
        {icon && (
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
        <div className="text-neutral-600 dark:text-neutral-400 mb-6">{children}</div>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white transition-colors"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}