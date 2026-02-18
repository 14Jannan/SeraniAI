import { useMemo, useState } from "react";
import { PERSONAL_PLANS, BUSINESS_PLANS } from "../../lib/pricingPlans";
import PlanCard from "./PlanCard";

export default function PricingPage() {
  const [mode, setMode] = useState("personal");

  const plans = useMemo(() => {
    return mode === "personal" ? PERSONAL_PLANS : BUSINESS_PLANS;
  }, [mode]);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Upgrade your plan
          </h1>

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
