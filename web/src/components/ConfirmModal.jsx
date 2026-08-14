import React, { useEffect } from "react";
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

/**
 * Centered, professional confirmation modal dialog
 * Replaces default browser confirm() popups with consistent UI across the app.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info' | 'primary'
  isLoading = false,
  loadingText,
}) => {
  // Handle ESC key press to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: <FiAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40",
      buttonBg:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-500/20 focus:ring-red-500",
    },
    warning: {
      icon: <FiAlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40",
      buttonBg:
        "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm shadow-amber-500/20 focus:ring-amber-500",
    },
    info: {
      icon: <FiInfo className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40",
      buttonBg:
        "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/20 focus:ring-blue-500",
    },
    primary: {
      icon: <FiInfo className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40",
      buttonBg:
        "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-500/20 focus:ring-indigo-500",
    },
  };

  const config = variantConfig[variant] || variantConfig.danger;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700/80 p-6 overflow-hidden transform transition-all duration-200 scale-100 animate-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          {/* Variant Icon Badge */}
          <div
            className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl ${config.iconBg}`}
          >
            {config.icon}
          </div>

          {/* Modal Header & Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-modal-title"
              className="text-lg font-bold text-gray-900 dark:text-white leading-tight"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${config.buttonBg}`}
          >
            {isLoading ? (loadingText || `${confirmText}...`) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
