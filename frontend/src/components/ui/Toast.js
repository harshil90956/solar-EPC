import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in ${
              toast.type === 'error' 
                ? 'bg-red-500/90 text-white' 
                : toast.type === 'success'
                ? 'bg-emerald-500/90 text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-base)]'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Simple toast export for direct usage
export const toast = {
  error: (message) => {
    console.error(`[Toast Error] ${message}`);
    // Create a temporary toast element
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-red-500/90 text-white animate-fade-in';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      toastEl.remove();
    }, 3000);
  },
  success: (message) => {
    console.log(`[Toast Success] ${message}`);
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-emerald-500/90 text-white animate-fade-in';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      toastEl.remove();
    }, 3000);
  }
};

export default toast;
