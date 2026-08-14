import React from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  CreditCard,
  Sparkles,
} from "lucide-react";

/**
 * Custom Toast component for rich, professional notification cards
 */
function CustomToast({ t, type, title, message, details, action }) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />;
      case "payment":
        return <CreditCard className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />;
      case "sparkle":
        return <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-emerald-200 dark:border-emerald-800/60";
      case "error":
        return "border-rose-200 dark:border-rose-800/60";
      case "warning":
        return "border-amber-200 dark:border-amber-800/60";
      case "payment":
        return "border-indigo-200 dark:border-indigo-800/60";
      case "sparkle":
        return "border-purple-200 dark:border-purple-800/60";
      case "info":
      default:
        return "border-blue-200 dark:border-blue-800/60";
    }
  };

  const getAccentBg = () => {
    switch (type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/40";
      case "error":
        return "bg-rose-50 dark:bg-rose-950/40";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/40";
      case "payment":
        return "bg-indigo-50 dark:bg-indigo-950/40";
      case "sparkle":
        return "bg-purple-50 dark:bg-purple-950/40";
      case "info":
      default:
        return "bg-blue-50 dark:bg-blue-950/40";
    }
  };

  return (
    <div
      className={`relative flex w-full max-w-md items-start gap-3 rounded-2xl border ${getBorderColor()} bg-white dark:bg-gray-900 p-4 shadow-xl shadow-neutral-900/5 transition-all ${
        t.visible ? "animate-in fade-in zoom-in-95 duration-200" : "animate-out fade-out zoom-out-95 duration-150"
      }`}
    >
      {/* Icon with accent container */}
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${getAccentBg()}`}>
        {getIcon()}
      </div>

      {/* Message content */}
      <div className="flex-1 pr-2 pt-0.5">
        {title && (
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
            {title}
          </h4>
        )}
        {message && (
          <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            {message}
          </p>
        )}
        {details && (
          <div className="mt-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-2 text-[11px] text-neutral-600 dark:text-neutral-300">
            {details}
          </div>
        )}
        {action && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                action.onClick?.();
                toast.dismiss(t.id);
              }}
              className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => toast.dismiss(t.id)}
        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition shrink-0"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Universal notify helper
 */
export const notify = {
  /**
   * Success notification
   */
  success: (title, message, options = {}) => {
    const toastId = options.id || `success-${title}`;
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type="success"
          title={title}
          message={message}
          details={options.details}
          action={options.action}
        />
      ),
      { id: toastId, duration: options.duration || 4500, ...options }
    );
  },

  /**
   * Error notification
   */
  error: (title, message, options = {}) => {
    const toastId = options.id || `error-${title}`;
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type="error"
          title={title}
          message={message}
          details={options.details}
          action={options.action}
        />
      ),
      { id: toastId, duration: options.duration || 5500, ...options }
    );
  },

  /**
   * Warning notification
   */
  warning: (title, message, options = {}) => {
    const toastId = options.id || `warning-${title}`;
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type="warning"
          title={title}
          message={message}
          details={options.details}
          action={options.action}
        />
      ),
      { id: toastId, duration: options.duration || 5000, ...options }
    );
  },

  /**
   * Info notification
   */
  info: (title, message, options = {}) => {
    const toastId = options.id || `info-${title}`;
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type="info"
          title={title}
          message={message}
          details={options.details}
          action={options.action}
        />
      ),
      { id: toastId, duration: options.duration || 4500, ...options }
    );
  },

  /* -------------------------------------------------------------
   * Specialized Payment & Subscription Notifications
   * ------------------------------------------------------------- */

  /**
   * Subscription cancelled successfully
   */
  subscriptionCancelled: ({ planName = "Subscription", endDate } = {}) => {
    const endFormatted = endDate ? new Date(endDate).toLocaleDateString() : "the end of your current billing period";
    return notify.success(
      "Subscription Cancelled",
      `Your ${planName} subscription cancellation has been confirmed. You will retain full access until ${endFormatted}.`,
      {
        id: "subscription-cancelled",
        duration: 6000,
        details: "No further recurring charges will be made to your payment method.",
      }
    );
  },

  /**
   * Enterprise premium access cancelled
   */
  enterpriseAccessCancelled: () => {
    return notify.success(
      "Enterprise Access Cancelled",
      "Your enterprise premium features have been cancelled. Your account is now on the Free plan.",
      {
        id: "enterprise-access-cancelled",
        duration: 5000,
        details: "You can upgrade independently anytime from the plans below.",
      }
    );
  },

  /**
   * Payment confirmed & subscription activated
   */
  paymentSuccess: ({ planName = "Pro" } = {}) => {
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          type="payment"
          title="Payment Confirmed!"
          message={`Your ${planName} plan is now active. All features have been unlocked.`}
          details="A receipt and order details have been recorded in your billing history."
        />
      ),
      { id: "payment-success", duration: 6000 }
    );
  },

  /**
   * Payment checkout cancelled
   */
  paymentCancelled: () => {
    return notify.info(
      "Checkout Cancelled",
      "Payment was not completed and no charges were made. You can resume checkout whenever you are ready.",
      { id: "payment-cancelled", duration: 5000 }
    );
  },

  /**
   * Upgrade blocked due to active subscription or enterprise seat
   */
  upgradeBlocked: ({ isEnterprise = false } = {}) => {
    return notify.warning(
      "Active Plan Detected",
      isEnterprise
        ? "Your account currently has enterprise-managed premium access. Please cancel your enterprise access first before switching plans."
        : "You already have an active paid subscription. Please cancel your current plan before switching to a different tier.",
      {
        id: "upgrade-blocked",
        duration: 5500,
        details: "Next step: Click 'Cancel Subscription' above to proceed with a plan change.",
      }
    );
  },


  /**
   * Dismiss all notifications
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

export default notify;
