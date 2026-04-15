const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

export default function PlanCard({ plan }) {
  const isHighlighted = Boolean(plan.highlight);

  const handleCheckout = async () => {
    if (plan.isCurrent) return;

    try {
      // React-only app -> call backend (Express) not /api/...
      const res = await fetch(`${API_BASE}/api/billing/payhere`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Payment initialization failed");
        return;
      }

      const { actionUrl, payload } = data;

      // Create PayHere form and submit
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
        <span className="pt-2 text-lg text-neutral-400">$</span>
        <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
        <div className="pt-3 text-sm text-neutral-500">
          <div>USD /</div>
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
