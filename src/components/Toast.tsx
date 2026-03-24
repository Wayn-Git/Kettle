'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(4px)' }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
              className={`glass-strong relative overflow-hidden rounded-[16px] border px-4 py-3.5 shadow-premium pointer-events-auto flex items-center gap-3 w-max max-w-sm ${toast.type === 'success'
                ? 'border-sky-500/30 bg-sky-500/5'
                : toast.type === 'error'
                  ? 'border-violet-500/30 bg-violet-500/5'
                  : 'border-white/10 bg-white/5'
                }`}
            >
              {/* Subtle background glow */}
              <div
                className={`absolute inset-0 opacity-20 blur-xl ${toast.type === 'success' ? 'bg-sky-500' :
                  toast.type === 'error' ? 'bg-violet-500' : 'bg-white'
                  }`}
              />

              <div className={`flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-full ${toast.type === 'success' ? 'bg-sky-500/20 text-sky-400' :
                toast.type === 'error' ? 'bg-violet-500/20 text-violet-400' :
                  'bg-white/10 text-zinc-300'
                }`}>
                {toast.type === 'success' && <span className="text-[11px]">✓</span>}
                {toast.type === 'error' && <span className="text-[11px]">✕</span>}
                {toast.type === 'info' && <span className="text-[11px]">i</span>}
              </div>

              <p className={`text-[14px] font-semibold tracking-tight relative z-10 ${toast.type === 'success' ? 'text-sky-50' :
                toast.type === 'error' ? 'text-violet-50' :
                  'text-zinc-100'
                }`}>
                {toast.message}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
