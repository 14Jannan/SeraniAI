import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Lock,
} from "lucide-react";
import Modal from "../../components/Modal";
import { cancelSubscription, getUserSubscription } from "../../api/subscriptionApi";
import { cancelEnterprisePremiumAccess } from "../../api/authApi";
import { getStoredToken, getStoredUser, saveAuthSession, getAuthStorageMode } from "../../utils/authStorage";
import notify from "../../utils/notifications";
import { API_BASE_URL } from "../../utils/apiBaseUrl";

/* API configuration */
const API_URL = API_BASE_URL;

/**
 * Decide (and fire) the right toast for a PayHere payment-confirmation
 * response. Extracted as a standalone, importable function so this branch -
 * "don't tell the user their plan is active until the notify webhook
 * actually confirmed it" - can be unit tested without rendering the whole
 * page.
 */
export const notifyPaymentConfirmationResult = (data) => {
  if (data?.pending) {
    notify.info(
      "Confirming Your Payment",
      "Your payment was received and is being confirmed. Your plan will update automatically within a moment - no action needed.",
      { id: "payment-pending", duration: 6000 }
    );
    return;
  }

  notify.paymentSuccess({ planName: data?.user?.plan || "Pro" });
};

/* Personal subscription plans array */
const PERSONAL_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    subtitle: "Daily journal entries only",
    isCurrent: true,
    cta: "Start Free",
    features: [
      { icon: "sparkle", text: "Unlimited daily journal entries" },
      { icon: "shield", text: "Standard privacy & security" },
      { icon: "sparkle", text: "Journal history and tracking" },
      { icon: "sparkle", text: "Weekly progress reports" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "4000",
    subtitle: "Everything included",
    badge: "POPULAR",
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      { icon: "sparkle", text: "Unlimited AI conversations" },
      { icon: "chat", text: "AI-powered emotional insights" },
      { icon: "sparkle", text: "Full access to all courses & content" },
      { icon: "sparkle", text: "Advanced analytics & mood tracking" },
      { icon: "sparkle", text: "Unlimited daily journal entries" },
      { icon: "shield", text: "Priority support" },
    ],
  },
];

/* Business subscription plans array */
const BUSINESS_PLANS = [
  {
    id: "free_business",
    name: "Free",
    price: "0",
    subtitle: "Daily journal entries only",
    isCurrent: true,
    cta: "Start Free",
    features: [
      { icon: "sparkle", text: "Unlimited daily journal entries" },
      { icon: "shield", text: "Standard privacy & security" },
      { icon: "sparkle", text: "Journal history and tracking" },
      { icon: "sparkle", text: "Weekly progress reports" },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "3000",
    subtitle: "Complete team management & AI access",
    badge: "RECOMMENDED",
    highlight: true,
    cta: "Upgrade to Business",
    features: [
      { icon: "shield", text: "Manage enterprise users" },
      { icon: "sparkle", text: "Full AI access for all team members" },
      { icon: "chat", text: "Unlimited conversations per seat" },
      { icon: "sparkle", text: "Advanced team analytics" },
      { icon: "sparkle", text: "Centralized billing & invoices" },
      { icon: "shield", text: "Team role management" },
      { icon: "sparkle", text: "Bulk user invitations" },
    ],
  },
];

/* Render appropriate feature icon based on kind parameter */
function FeatureIcon({ kind }) {
  const common = "h-3.5 w-3.5";
  if (kind === "sparkle") return <Sparkles className={common} />;
  if (kind === "chat") return <MessageCircle className={common} />;
  if (kind === "shield") return <ShieldCheck className={common} />;
  return <span className="h-3.5 w-3.5" />;
}

/* Reusable subscription plan card component with upgrade functionality */
function PlanCard({ plan, onUpgrade, disableUpgrade }) {
  const isHighlighted = Boolean(plan.highlight);
  const isDisabled = plan.isCurrent || disableUpgrade;

  const handleCheckout = () => {
    if (isDisabled) return;
    onUpgrade(plan);
  };

  return (
    <div
      className={[
        "relative flex flex-col rounded-3xl border bg-white p-7 transition-all duration-200",
        isHighlighted
          ? "border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white shadow-lg shadow-indigo-100 ring-1 ring-indigo-500/20 hover:shadow-xl"
          : "border-neutral-200 shadow-sm hover:shadow-md hover:-translate-y-0.5",
      ].join(" ")}
    >
      {plan.badge ? (
        <div
          className={[
            "absolute right-6 top-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
            isHighlighted
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-600",
          ].join(" ")}
        >
          <Star className="h-3 w-3 fill-current" />
          {plan.badge}
        </div>
      ) : null}

      <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">{plan.name}</h3>

      <div className="mt-5 flex items-start gap-1.5">
        <span className="pt-2 text-lg font-medium text-neutral-400">LKR</span>
        <span className="text-5xl font-bold tracking-tight text-neutral-900">{plan.price}</span>
        <div className="pt-3 text-sm leading-tight text-neutral-500">
          <div>/</div>
          <div>month</div>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-neutral-700">
        {plan.subtitle}
      </p>

      <button
        type="button"
        className={[
          "mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold transition",
          isDisabled
            ? "border border-neutral-200 bg-neutral-50 text-neutral-400"
            : isHighlighted
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
        onClick={handleCheckout}
        disabled={isDisabled}
      >
        {plan.isCurrent
          ? "Your current plan"
          : disableUpgrade
          ? "Cancel current plan first"
          : plan.cta}
      </button>

      <div className="mt-7 border-t border-neutral-100 pt-6">
        <ul className="space-y-3.5">
          {plan.features.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <span
                className={[
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isHighlighted ? "bg-indigo-100 text-indigo-600" : "bg-neutral-100 text-neutral-600",
                ].join(" ")}
              >
                <FeatureIcon kind={f.icon} />
              </span>
              <span className="pt-0.5 text-sm text-neutral-700">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* Main subscription page component displaying personal and business plans */
export default function Subscription() {
  const navigate = useNavigate();
  /* State for toggling between personal and business subscription modes */
  const [mode, setMode] = useState("personal");
  /* Current subscription information */
  const [currentSubscription, setCurrentSubscription] = useState(null);
  /* Loading state for subscription fetch */
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  /* Modal and cancellation state management */
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [showEnterpriseCancelModal, setShowEnterpriseCancelModal] = useState(false);
  const [enterpriseCancelLoading, setEnterpriseCancelLoading] = useState(false);
  /* Current user role and upgrade error handling */
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [upgradeBlockError, setUpgradeBlockError] = useState(null);

  /* Memoize plan array based on current mode */
  const plans = useMemo(() => {
    return mode === "personal" ? PERSONAL_PLANS : BUSINESS_PLANS;
  }, [mode]);

  /* Memoize responsive grid layout for plan cards */
  const cardsLayoutClass = useMemo(() => {
    if (mode === "personal") {
      return plans.length <= 2
        ? "mx-auto max-w-4xl grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    }

    return "mx-auto max-w-4xl grid-cols-1 md:grid-cols-2";
  }, [mode, plans.length]);

  /* Payment redirect processing guard to avoid duplicate calls in dev mode */
  const paymentProcessedRef = useRef(false);

  /* Handle payment success/cancellation callback from PayHere redirect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get("payment");

    if (!paymentState || paymentProcessedRef.current) {
      return;
    }
    paymentProcessedRef.current = true;

    const clearQuery = () => {
      window.history.replaceState({}, "", "/subscription");
    };

    if (paymentState === "cancelled") {
      localStorage.removeItem("payhere_pending_order_id");
      clearQuery();
      notify.paymentCancelled();
      return;
    }

    if (paymentState !== "success") {
      clearQuery();
      return;
    }

    const token = getStoredToken();
    const orderId = localStorage.getItem("payhere_pending_order_id");
    localStorage.removeItem("payhere_pending_order_id");
    clearQuery();

    if (!token || !orderId) {
      return;
    }

    const confirmPayment = async () => {
      try {
        const response = await fetch(`${API_URL}/api/billing/payhere/confirm-return`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json().catch(() => null);
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(
            new CustomEvent("serani:user-updated", { detail: data.user })
          );
        }

        notifyPaymentConfirmationResult(data);
      } catch (err) {
        console.error("Payment confirmation error:", err);
        notify.error("Payment Confirmation", "Your payment was received. If your plan does not update immediately, please refresh in a moment.");
      } finally {
        navigate("/dashboard");
      }
    };

    confirmPayment();
  }, [navigate]);


  /* Fetch current user role and subscription on mount */
  useEffect(() => {
    try {
      const storedUser = getStoredUser();
      setCurrentUserRole(storedUser?.role || null);
    } catch {
      setCurrentUserRole(null);
    }

    const fetchCurrentSubscription = async () => {
      try {
        setLoadingSubscription(true);
        const response = await getUserSubscription();
        setCurrentSubscription(response.data);
      } catch (error) {
        console.error("Failed to fetch current subscription:", error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchCurrentSubscription();
  }, []);

  const handleUpgrade = (plan) => {
    if (mustCancelBeforeUpgrade) {
      setUpgradeBlockError(upgradeBlockMessage);
      notify.upgradeBlocked({ isEnterprise: currentUserRole === "enterpriseUser" });
      return;
    }

    if (mode === "business" || plan.id === "business") {
      navigate(`/subscription/checkout/enterprise/${plan.id}`);
      return;
    }

    navigate(`/subscription/checkout/personal/${plan.id}`);
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      setCancelError(null);
      
      if (!currentSubscription?._id) {
        setCancelError("Subscription ID not found");
        return;
      }

      await cancelSubscription(currentSubscription._id);
      
      // Close modal
      setShowCancelModal(false);

      // Display professional user-friendly toast
      const planDisplayName = currentSubscription.plan === "Personal" 
        ? "Pro" 
        : currentSubscription.plan === "Business" 
        ? "Business" 
        : "Subscription";

      notify.subscriptionCancelled({
        planName: planDisplayName,
        endDate: currentSubscription.nextChargeDate || currentSubscription.endDate,
      });

      // Update current subscription status locally and refetch
      setCurrentSubscription((prev) => (prev ? { ...prev, status: "Cancelled" } : null));

      try {
        const res = await getUserSubscription();
        if (res.data) {
          setCurrentSubscription(res.data);
        }
      } catch (e) {
        console.warn("Could not refetch updated subscription:", e);
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      const errorMsg = error.response?.data?.message || "Failed to cancel subscription. Please try again.";
      setCancelError(errorMsg);
      notify.error("Cancellation Failed", errorMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelEnterprisePremium = () => {
    setShowEnterpriseCancelModal(true);
  };

  const confirmCancelEnterprisePremium = async () => {
    try {
      setEnterpriseCancelLoading(true);
      const response = await cancelEnterprisePremiumAccess();
      if (response.data?.user) {
        saveAuthSession({
          token: getStoredToken(),
          user: response.data.user,
          rememberMe: getAuthStorageMode() === "localStorage",
        });
      }
      setShowEnterpriseCancelModal(false);
      setCurrentUserRole("user");
      setUpgradeBlockError(null);
      notify.enterpriseAccessCancelled();
      
      // Refresh subscription state
      try {
        const res = await getUserSubscription();
        setCurrentSubscription(res.data || null);
      } catch (e) {
        setCurrentSubscription(null);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to cancel enterprise premium access. Please try again.";
      notify.error("Cancellation Failed", msg);
    } finally {
      setEnterpriseCancelLoading(false);
    }
  };


  const hasActiveSubscription = currentSubscription?.status === "Active";
  const mustCancelBeforeUpgrade =
    currentUserRole === "enterpriseUser" || hasActiveSubscription;
  const upgradeBlockMessage =
    currentUserRole === "enterpriseUser"
      ? "Your premium access is managed by your enterprise. Cancel your current enterprise premium access first before upgrading to another plan."
      : "You already have an active subscription. Cancel your current plan first before upgrading to another plan.";

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Current Subscription Section */}
        {currentUserRole === "enterpriseUser" && (
          <section className="mt-10 mb-12">
            <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50/60 p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">
                    Enterprise Premium Access
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700">
                    Your premium features are provided by your enterprise admin.
                    If you cancel, your account will be downgraded to Free features.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelEnterprisePremium}
                className="mt-6 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow"
              >
                Cancel Premium Features
              </button>
            </div>
          </section>
        )}

        {currentSubscription && (
          <section className="mt-10 mb-12">
            <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50/60 px-8 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-semibold text-neutral-900">
                  Your Current Plan
                </h2>
              </div>

              <div className="space-y-3 px-8 py-6">
                <div className="flex justify-between border-b border-neutral-100 pb-3">
                  <span className="text-sm text-neutral-500">Plan Name</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {currentSubscription.plan === "Personal"
                      ? "Pro"
                      : currentSubscription.plan === "Business"
                      ? "Business"
                      : "Free"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-100 pb-3">
                  <span className="text-sm text-neutral-500">Status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      currentSubscription.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : currentSubscription.status === "Cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {currentSubscription.status}
                  </span>
                </div>

                {currentSubscription.amount && (
                  <div className="flex justify-between border-b border-neutral-100 pb-3">
                    <span className="text-sm text-neutral-500">Monthly Price</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      LKR {currentSubscription.amount}
                    </span>
                  </div>
                )}

                {currentSubscription.nextChargeDate && (
                  <div className="flex justify-between pb-1">
                    <span className="text-sm text-neutral-500">Next Charge Date</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {new Date(currentSubscription.nextChargeDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              {currentSubscription.status === "Active" &&
               currentSubscription.plan !== undefined &&
               currentSubscription.plan !== null && (
                <div className="border-t border-neutral-100 px-8 py-5">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Title + plan toggle */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            Pricing
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Upgrade your plan
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Personal and Business plans are billed monthly.
          </p>

          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("personal")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  mode === "personal"
                    ? "bg-white text-neutral-900 shadow"
                    : "text-neutral-500 hover:text-neutral-800",
                ].join(" ")}
              >
                Personal
              </button>

              <button
                type="button"
                onClick={() => setMode("business")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  mode === "business"
                    ? "bg-white text-neutral-900 shadow"
                    : "text-neutral-500 hover:text-neutral-800",
                ].join(" ")}
              >
                Business
              </button>
            </div>
          </div>
        </div>

        {mustCancelBeforeUpgrade && (
          <section className="mb-8">
            <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-900 shadow-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{upgradeBlockMessage}</span>
            </div>
          </section>
        )}

        {upgradeBlockError && (
          <section className="mb-8">
            <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{upgradeBlockError}</span>
            </div>
          </section>
        )}

        {/* Title for Upgrade Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {currentSubscription?.status === "Active" ? "Upgrade your plan" : "Select a plan"}
          </h2>
        </div>

        {/* Cards */}
        <section className="mt-10">
          <div className={["grid gap-6", cardsLayoutClass].join(" ")}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onUpgrade={handleUpgrade}
                disableUpgrade={mustCancelBeforeUpgrade && !plan.isCurrent}
              />
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <Lock className="h-3.5 w-3.5" />
          Payments via PayHere Hosted Checkout (wire-up).
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelError(null);
        }}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-neutral-700 text-sm">
            Are you sure you want to cancel your subscription?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Your subscription will be cancelled immediately.
            </p>
          </div>

          {cancelError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{cancelError}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => {
                setShowCancelModal(false);
                setCancelError(null);
              }}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition"
              disabled={cancelLoading}
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
              disabled={cancelLoading}
            >
              {cancelLoading ? "Cancelling..." : "Cancel Plan"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Enterprise Cancel Confirmation Modal */}
      <Modal
        isOpen={showEnterpriseCancelModal}
        onClose={() => setShowEnterpriseCancelModal(false)}
        title="Cancel Enterprise Premium Access"
      >
        <div className="space-y-4">
          <p className="text-neutral-700 text-sm">
            Are you sure you want to cancel your enterprise-provided premium access?
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You will immediately revert to the Free plan and lose enterprise workspace features.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setShowEnterpriseCancelModal(false)}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition"
              disabled={enterpriseCancelLoading}
            >
              Keep Access
            </button>
            <button
              onClick={confirmCancelEnterprisePremium}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
              disabled={enterpriseCancelLoading}
            >
              {enterpriseCancelLoading ? "Cancelling..." : "Cancel Premium"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

