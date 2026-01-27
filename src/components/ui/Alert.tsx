'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  Loader2 
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  duration?: number; // Auto-dismiss after duration (ms), 0 = no auto-dismiss
}

export interface ToastProps extends Omit<AlertProps, 'className'> {
  id: string;
}

// ============================================
// Alert Component (Inline)
// ============================================

const alertStyles: Record<AlertType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-800 dark:text-green-200',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
  },
  loading: {
    bg: 'bg-neutral-50 dark:bg-neutral-800',
    border: 'border-neutral-200 dark:border-neutral-700',
    icon: 'text-primary-600 dark:text-primary-400',
    text: 'text-neutral-800 dark:text-neutral-200',
  },
};

const AlertIcon = ({ type }: { type: AlertType }) => {
  const iconClass = `w-5 h-5 ${alertStyles[type].icon}`;
  
  switch (type) {
    case 'success':
      return <CheckCircle className={iconClass} />;
    case 'error':
      return <AlertCircle className={iconClass} />;
    case 'warning':
      return <AlertTriangle className={iconClass} />;
    case 'info':
      return <Info className={iconClass} />;
    case 'loading':
      return <Loader2 className={`${iconClass} animate-spin`} />;
  }
};

export function Alert({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className = '',
}: AlertProps) {
  const styles = alertStyles[type];

  return (
    <div
      className={`
        rounded-xl border p-4 ${styles.bg} ${styles.border} ${className}
      `}
      role="alert"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertIcon type={type} />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold ${styles.text} mb-1`}>
              {title}
            </h4>
          )}
          <p className={`text-sm ${styles.text} opacity-90`}>
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sm font-medium ${styles.icon} hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${styles.text}`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Toast Component (Floating notifications)
// ============================================

function Toast({ id, type = 'info', title, message, dismissible = true, onDismiss, action, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300); // Match animation duration
  };

  const styles = alertStyles[type];

  return (
    <div
      className={`
        w-full max-w-sm rounded-xl border shadow-lg ${styles.bg} ${styles.border}
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertIcon type={type} />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className={`font-semibold ${styles.text} mb-1`}>
                {title}
              </h4>
            )}
            <p className={`text-sm ${styles.text} opacity-90`}>
              {message}
            </p>
            {action && (
              <button
                onClick={() => {
                  action.onClick();
                  handleDismiss();
                }}
                className={`mt-2 text-sm font-medium ${styles.icon} hover:underline`}
              >
                {action.label}
              </button>
            )}
          </div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${styles.text}`}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Toast Context & Provider
// ============================================

interface ToastContextType {
  showToast: (props: Omit<ToastProps, 'id' | 'onDismiss'>) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((props: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, dismissAll }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  // Return safe no-op functions when used outside ToastProvider
  // This allows components to use useToast without crashing during SSR or initial render
  if (!context) {
    return {
      showToast: (_props: Omit<ToastProps, 'id' | 'onDismiss'>) => '',
      dismissToast: (_id: string) => {},
      dismissAll: () => {},
    };
  }
  return context;
}

// ============================================
// Confirmation Dialog
// ============================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-primary-600 hover:bg-primary-700 text-white',
  };

  const iconStyles = {
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconStyles[type]}`}>
            {type === 'danger' ? <AlertCircle className="w-6 h-6" /> :
             type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
             <Info className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonStyles[type]}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Banner Alert (Full width, dismissible)
// ============================================

interface BannerProps {
  type?: AlertType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({
  type = 'info',
  message,
  action,
  dismissible = true,
  onDismiss,
}: BannerProps) {
  const styles = alertStyles[type];

  return (
    <div className={`${styles.bg} border-b ${styles.border}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertIcon type={type} />
            <p className={`text-sm ${styles.text}`}>
              {message}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {action && (
              <button
                onClick={action.onClick}
                className={`text-sm font-medium ${styles.icon} hover:underline`}
              >
                {action.label}
              </button>
            )}
            {dismissible && onDismiss && (
              <button
                onClick={onDismiss}
                className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${styles.text}`}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Update Notification (For real-time updates)
// ============================================

interface UpdateNotificationProps {
  show: boolean;
  message?: string;
  onRefresh?: () => void;
}

export function UpdateNotification({
  show,
  message = 'New updates available',
  onRefresh,
}: UpdateNotificationProps) {
  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
        <Bell className="w-4 h-4 animate-bounce" />
        <span className="text-sm font-medium">{message}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm font-semibold hover:underline"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

export default Alert;
