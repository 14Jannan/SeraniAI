import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import { cancelSubscription, getUserSubscription } from "../../api/subscriptionApi";
import { cancelEnterprisePremiumAccess } from "../../api/authApi";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

const PERSONAL_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    subtitle: "See what Serani AI can do",
    isCurrent: true,
    cta: "Start Free",
    features: [
      { icon: "sparkle", text: "Get simple emotional insights" },
      { icon: "chat", text: "Short AI chats for common questions" },
      { icon: "sparkle", text: "Basic journaling and mood tracking" },
      { icon: "shield", text: "Standard privacy & security" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "4000",
    subtitle: "Maximize productivity & growth",
    badge: "POPULAR",
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      { icon: "sparkle", text: "Maximum AI usage + best insights" },
      { icon: "chat", text: "Faster responses & priority handling" },
      { icon: "sparkle", text: "Deep analytics (mood + tasks)" },
      { icon: "sparkle", text: "Full access to all content & courses" },
      { icon: "shield", text: "Premium support channel" },
      { icon: "sparkle", text: "Best for heavy usage users" },
    ],
  },
];

const BUSINESS_PLANS = [
  {
    id: "free_business",
    name: "Free",
    price: "0",
    subtitle: "Try Serani AI for teams (limited)",
    isCurrent: true,
    cta: "Start Free",
    features: [
      { icon: "sparkle", text: "Limited seats for testing" },
      { icon: "chat", text: "Limited AI usage per seat" },
      { icon: "shield", text: "Basic admin controls" },
      { icon: "sparkle", text: "Simple usage view" },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "3000",
    subtitle: "Get more work done with Serani AI for teams",
    badge: "RECOMMENDED",
    highlight: true,
    cta: "Upgrade to Business",
    features: [
      { icon: "shield", text: "Organization dashboard + roles" },
      { icon: "sparkle", text: "Team usage analytics & insights" },
      { icon: "chat", text: "Higher AI usage per seat" },
      { icon: "shield", text: "SSO-ready (future)" },
      { icon: "sparkle", text: "Central billing + invoices" },
      { icon: "sparkle", text: "Bulk invites and onboarding" },
      { icon: "shield", text: "Admin controls for licenses" },
    ],
  },
];

function IconSparkle({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2l1.2 5.2L18 8.4l-4.8 1.2L12 15l-1.2-5.4L6 8.4l4.8-1.2L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M19 13l.7 3 2.3.6-2.3.6-.7 3-.7-3-2.3-.6 2.3-.6.7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChat({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h8M8 12h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12l1.8 1.8L15.5 9.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIcon({ kind }) {
  const common = "h-5 w-5 text-neutral-700";
  if (kind === "sparkle") return <IconSparkle className={common} />;
  if (kind === "chat") return <IconChat className={common} />;
  if (kind === "shield") return <IconShield className={common} />;
  return <span className="h-5 w-5" />;
}

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
        "relative rounded-2xl border bg-white p-7 shadow-sm",
        isHighlighted
          ? "border-indigo-400 bg-indigo-50/60"
          : "border-neutral-200",
      ].join(" ")}
    >
      {plan.badge ? (
        <div
          className={[
            "absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-medium",
            isHighlighted
              ? "bg-indigo-100 text-indigo-700"
              : "bg-neutral-100 text-neutral-600",
          ].join(" ")}
        >
          {plan.badge}
        </div>
      ) : null}

      <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>

      <div className="mt-5 flex items-start gap-2">
        <span className="pt-2 text-lg text-neutral-400">LKR</span>
        <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
        <div className="pt-3 text-sm text-neutral-500">
          <div>/</div>
          <div>month</div>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-neutral-900">
        {plan.subtitle}
      </p>

      <button
        type="button"
        className={[
          "mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold transition",
          isDisabled
            ? "border border-neutral-200 bg-white text-neutral-500"
            : isHighlighted
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
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

      <ul className="mt-7 space-y-4">
        {plan.features.map((f) => (
          <li key={f.text} className="flex gap-3">
            <FeatureIcon kind={f.icon} />
            <span className="text-sm text-neutral-800">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("personal");
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [upgradeBlockError, setUpgradeBlockError] = useState(null);

  const plans = useMemo(() => {
    return mode === "personal" ? PERSONAL_PLANS : BUSINESS_PLANS;
  }, [mode]);

  const cardsLayoutClass = useMemo(() => {
    if (mode === "personal") {
      // With only Free + Pro, keep cards centered on large screens.
      return plans.length <= 2
        ? "mx-auto max-w-4xl grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    }

    return "mx-auto max-w-4xl grid-cols-1 md:grid-cols-2";
  }, [mode, plans.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get("payment");

    if (!paymentState) {
      return;
    }

    const clearQuery = () => {
      window.history.replaceState({}, "", "/subscription");
    };

    if (paymentState === "cancelled") {
      localStorage.removeItem("payhere_pending_order_id");
      clearQuery();
      return;
    }

    if (paymentState !== "success") {
      clearQuery();
      return;
    }

    const token = localStorage.getItem("token");
    const orderId = localStorage.getItem("payhere_pending_order_id");

    if (!token || !orderId) {
      clearQuery();
      return;
    }

    const confirmPayment = async () => {
      try {
        await fetch(`${API_BASE}/api/billing/payhere/confirm-return`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });
      } finally {
        localStorage.removeItem("payhere_pending_order_id");
        clearQuery();
        navigate("/dashboard");
      }
    };

    confirmPayment();
  }, [navigate]);

  // Fetch current subscription
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
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
      
      // Show success message
      alert("Subscription cancelled successfully. Your access will continue until the end of your billing period.");
      
      // Close modal and refresh the page so plan/status UI is fully re-fetched.
      setShowCancelModal(false);
      setCurrentSubscription(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      const errorMsg = error.response?.data?.message || "Failed to cancel subscription. Please try again.";
      setCancelError(errorMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCancelEnterprisePremium = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel enterprise premium access? You will be moved to the Free plan immediately."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await cancelEnterprisePremiumAccess();
      if (response.data?.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      alert(response.data?.message || "Enterprise premium access cancelled.");
      window.location.reload();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to cancel enterprise premium access."
      );
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
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Current Subscription Section */}
        {currentUserRole === "enterpriseUser" && (
          <section className="mt-10 mb-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/60 p-8">
              <h2 className="text-2xl font-semibold text-neutral-900">
                Enterprise Premium Access
              </h2>
              <p className="mt-3 text-sm text-neutral-700">
                Your premium features are provided by your enterprise admin.
                If you cancel, your account will be downgraded to Free features.
              </p>
              <button
                onClick={handleCancelEnterprisePremium}
                className="mt-6 rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Cancel Premium Features
              </button>
            </div>
          </section>
        )}

        {currentSubscription && (
          <section className="mt-10 mb-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-green-200 bg-green-50/50 p-8">
              <h2 className="text-2xl font-semibold text-neutral-900">
                Your Current Plan
              </h2>
              
              <div className="mt-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Plan Name:</span>
                  <span className="font-semibold text-neutral-900">
                    {currentSubscription.plan === "Personal" 
                      ? "Pro" 
                      : currentSubscription.plan === "Business" 
                      ? "Business" 
                      : "Free"}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <span className={`font-semibold ${
                    currentSubscription.status === "Active" 
                      ? "text-green-600" 
                      : currentSubscription.status === "Cancelled"
                      ? "text-red-600"
                      : "text-neutral-600"
                  }`}>
                    {currentSubscription.status}
                  </span>
                </div>

                {currentSubscription.amount && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Monthly Price:</span>
                    <span className="font-semibold text-neutral-900">
                      LKR {currentSubscription.amount}
                    </span>
                  </div>
                )}

                {currentSubscription.nextChargeDate && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Next Charge Date:</span>
                    <span className="font-semibold text-neutral-900">
                      {new Date(currentSubscription.nextChargeDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              {currentSubscription.status === "Active" && 
               currentSubscription.plan !== undefined &&
               currentSubscription.plan !== null && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="mt-6 rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </section>
        )}

        {/* Title + plan toggle */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Upgrade your plan
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Personal and Business plans are billed monthly.
          </p>

          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-neutral-100 p-1 shadow-sm">
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
            <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-900">
              {upgradeBlockMessage}
            </div>
          </section>
        )}

        {upgradeBlockError && (
          <section className="mb-8">
            <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {upgradeBlockError}
            </div>
          </section>
        )}

        {/* Title for Upgrade Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium tracking-tight">
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
        <div className="mt-10 text-center text-xs text-neutral-400">
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
              <strong>Note:</strong> Your subscription will be cancelled immediately, but you'll retain access until the end of your current billing period (
              {currentSubscription?.nextChargeDate 
                ? new Date(currentSubscription.nextChargeDate).toLocaleDateString()
                : "end of period"}
              ).
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
    </main>
  );
}
