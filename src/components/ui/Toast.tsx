'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />,
  };

  const styles = {
    success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30',
    error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg dark:shadow-neutral-900/50 animate-slide-in-right min-w-[300px] max-w-[400px]',
        styles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">{toast.message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}