import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7001";

const MIN_BUSINESS_SEATS = 5;

const ENTERPRISE_PLANS = {
  business: {
    id: "business",
    name: "Business",
    price: "3000",
    subtitle: "Get more work done with Serani AI for teams",
    features: [
      "Organization dashboard and role management",
      "Team usage analytics and insights",
      "Higher AI usage per seat",
      "Central billing and invoices",
      "Bulk invites and onboarding",
      "Admin controls for licenses",
    ],
  },
};

export default function EnterpriseCheckout() {
  const navigate = useNavigate();
  const { planId } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seats, setSeats] = useState(MIN_BUSINESS_SEATS);

  const plan = useMemo(() => ENTERPRISE_PLANS[planId], [planId]);
  const totalAmount = useMemo(() => {
    if (!plan) return 0;
    return Number(plan.price) * seats;
  }, [plan, seats]);

  const handleConfirm = async () => {
    if (!plan) return;

    setLoading(true);
    setError("");

    try {
      const safeSeats = Math.max(MIN_BUSINESS_SEATS, Math.floor(Number(seats) || 0));
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/billing/payhere`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId: plan.id, seats: safeSeats }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Payment initialization failed");
        setLoading(false);
        return;
      }

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
      setError("Something went wrong while starting payment");
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-neutral-900">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 p-8">
          <h1 className="text-2xl font-semibold">Invalid plan</h1>
          <p className="mt-3 text-sm text-neutral-600">
            We could not find this enterprise plan.
          </p>
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="mt-6 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to Subscription
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-5 py-10 text-neutral-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="mb-6 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
            <h1 className="text-4xl font-semibold tracking-tight">{plan.name} plan</h1>
            <p className="mt-3 text-sm text-neutral-600">{plan.subtitle}</p>

            <div className="mt-8 rounded-2xl border border-neutral-200 p-4">
              <p className="text-sm font-semibold text-neutral-700">Seats</p>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-neutral-300 text-xl"
                  onClick={() => setSeats((prev) => Math.max(MIN_BUSINESS_SEATS, prev - 1))}
                  disabled={loading || seats <= MIN_BUSINESS_SEATS}
                >
                  -
                </button>
                <span className="text-2xl font-semibold">{seats}</span>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-neutral-300 text-xl"
                  onClick={() => setSeats((prev) => prev + 1)}
                  disabled={loading}
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                LKR {Number(plan.price).toFixed(2)} per seat / month
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Minimum {MIN_BUSINESS_SEATS} seats
              </p>
            </div>

            <h2 className="mt-8 text-xl font-semibold">Top features</h2>
            <ul className="mt-4 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm text-neutral-800">
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold">Order summary</h2>

            <div className="mt-6 border-t border-neutral-200 pt-6 text-sm">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-600">Monthly subscription</span>
                <span>
                  {seats} x LKR {Number(plan.price).toFixed(2)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-2xl font-semibold">
                <span>Due today</span>
                <span>LKR {totalAmount.toFixed(2)}</span>
              </div>
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
              className="mt-8 w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading
                ? "Redirecting..."
                : `Proceed to Payment (LKR ${totalAmount.toFixed(2)})`}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
