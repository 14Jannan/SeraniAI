import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Lock, Minus, Plus, Users } from "lucide-react";
import { getStoredToken } from "../../../utils/authStorage";
import notify from "../../../utils/notifications";
import { API_BASE_URL } from "../../../utils/apiBaseUrl";

/* API configuration */
const API_URL = API_BASE_URL;

/* Minimum seat requirement for Business plan */
const MIN_BUSINESS_SEATS = 5;

/* Enterprise subscription plan definitions */
const ENTERPRISE_PLANS = {
  business: {
    id: "business",
    name: "Business",
    price: "3000",
    subtitle: "Complete team management & AI access",
    features: [
      "Manage enterprise users and roles",
      "Full AI access for all team members",
      "Unlimited conversations per seat",
      "Advanced team analytics and insights",
      "Centralized billing and invoices",
      "Bulk user invitations and onboarding",
    ],
  },
};

/* Enterprise checkout page component for Business plan purchases */
export default function EnterpriseCheckout() {
  const navigate = useNavigate();
  const { planId } = useParams();

  /* State management for payment processing and seat selection */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seats, setSeats] = useState(MIN_BUSINESS_SEATS);

  /* Memoized plan selection based on route parameter */
  const plan = useMemo(() => ENTERPRISE_PLANS[planId], [planId]);
  /* Calculate total amount based on price per seat */
  const totalAmount = useMemo(() => {
    if (!plan) return 0;
    return Number(plan.price) * seats;
  }, [plan, seats]);

  /* Initialize PayHere payment with selected number of seats */
  const handleConfirm = async () => {
    if (!plan) return;

    setLoading(true);
    setError("");

    try {
      const safeSeats = Math.max(MIN_BUSINESS_SEATS, Math.floor(Number(seats) || 0));
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/api/billing/payhere`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId: plan.id, seats: safeSeats }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data?.error || "Enterprise payment initialization failed. Please try again.";
        setError(errorMsg);
        notify.error("Payment Initialization Failed", errorMsg);
        setLoading(false);
        return;
      }

      /* Store order ID and submit PayHere form */
      const { actionUrl, payload } = data;
      localStorage.setItem(
        "payhere_pending_order_id",
        String(payload?.order_id || "")
      );

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
      const errMsg = "Unable to connect to payment gateway. Please check your connection and try again.";
      setError(errMsg);
      notify.error("Payment Gateway Error", errMsg);
      setLoading(false);
    }
  };


  /* Show error message if plan is invalid */
  if (!plan) {
    return (
      <main className="min-h-screen bg-neutral-50 px-6 py-16 text-neutral-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Invalid plan</h1>
          <p className="mt-3 text-sm text-neutral-600">
            We could not find this enterprise plan.
          </p>
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Subscription
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-neutral-50 to-neutral-50 px-5 py-10 text-neutral-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Users className="h-3.5 w-3.5" />
              {plan.name} plan
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">{plan.name} plan</h1>
            <p className="mt-3 text-sm text-neutral-600">{plan.subtitle}</p>

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-sm font-semibold text-neutral-700">Seats</p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                  onClick={() => setSeats((prev) => Math.max(MIN_BUSINESS_SEATS, prev - 1))}
                  disabled={loading || seats <= MIN_BUSINESS_SEATS}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-2xl font-bold text-neutral-900">{seats}</span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
                  onClick={() => setSeats((prev) => prev + 1)}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                LKR {Number(plan.price).toFixed(2)} per seat / month
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Minimum {MIN_BUSINESS_SEATS} seats
              </p>
            </div>

            <div className="mt-8 border-t border-neutral-100 pt-8">
              <h2 className="text-xl font-semibold">Top features</h2>
              <ul className="mt-4 space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="pt-0.5 text-sm text-neutral-800">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9 lg:sticky lg:top-10">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h2 className="text-2xl font-semibold">Order summary</h2>
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-6 text-sm">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-600">Monthly subscription</span>
                <span className="font-medium">
                  {seats} x LKR {Number(plan.price).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-4 text-lg font-semibold text-indigo-900">
              <span>Due today</span>
              <span>LKR {totalAmount.toFixed(2)}</span>
            </div>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="mt-8 w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-md disabled:opacity-60 disabled:shadow-none"
            >
              {loading
                ? "Redirecting..."
                : `Proceed to Payment (LKR ${totalAmount.toFixed(2)})`}
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
              <Lock className="h-3.5 w-3.5" />
              Secure checkout via PayHere
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
