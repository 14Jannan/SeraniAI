import { useEffect, useMemo, useState } from "react";

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
    id: "go",
    name: "Go",
    price: "1000",
    subtitle: "Keep progressing with expanded access",
    cta: "Upgrade to Go",
    features: [
      { icon: "sparkle", text: "Explore topics in depth with AI" },
      { icon: "chat", text: "Chat longer and more frequently" },
      { icon: "sparkle", text: "More guided reflections & prompts" },
      { icon: "shield", text: "Improved account management" },
      { icon: "sparkle", text: "Extra token allowance monthly" },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "2000",
    subtitle: "Unlock the full experience",
    badge: "POPULAR",
    highlight: true,
    cta: "Upgrade to Plus",
    features: [
      { icon: "sparkle", text: "Advanced AI insights & mood analysis" },
      { icon: "chat", text: "Multi-session chat memory support" },
      { icon: "sparkle", text: "Higher token limits (AI usage)" },
      { icon: "sparkle", text: "Premium reflective activities & courses" },
      { icon: "shield", text: "Enhanced privacy controls" },
      { icon: "sparkle", text: "Priority feature access" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "4000",
    subtitle: "Maximize productivity & growth",
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

function PlanCard({ plan }) {
  const isHighlighted = Boolean(plan.highlight);

  const handleCheckout = async () => {
    if (plan.isCurrent) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/billing/payhere`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Payment initialization failed");
        return;
      }

      const { actionUrl, payload } = data;
      localStorage.setItem("payhere_pending_order_id", String(payload.order_id || ""));

      const form = document.createElement("form");
      form.method = "POST";
      form.action = actionUrl;

      Object.entries(payload).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
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
          plan.isCurrent
            ? "border border-neutral-200 bg-white text-neutral-500"
            : isHighlighted
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
        onClick={handleCheckout}
        disabled={plan.isCurrent}
      >
        {plan.isCurrent ? "Your current plan" : plan.cta}
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
  const [mode, setMode] = useState("personal");

  const plans = useMemo(() => {
    return mode === "personal" ? PERSONAL_PLANS : BUSINESS_PLANS;
  }, [mode]);

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
      }
    };

    confirmPayment();
  }, []);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Upgrade your plan
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Personal and Business plans are billed monthly.
          </p>

          {/* Segmented control */}
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

        {/* Cards */}
        <section className="mt-10">
          <div
            className={[
              "grid gap-6",
              mode === "personal"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1 md:grid-cols-2",
            ].join(" ")}
          >
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-10 text-center text-xs text-neutral-400">
          Payments via PayHere Hosted Checkout (wire-up).
        </div>
      </div>
    </main>
  );
}
