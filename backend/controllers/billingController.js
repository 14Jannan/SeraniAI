const crypto = require("crypto");
const mongoose = require("mongoose");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Enterprise = require("../models/enterpriseModel");
const payHereService = require("../services/payHereService");

/* Plan configuration with pricing and role mapping */
const PLAN_DETAILS = {
  pro: { plan: "Personal", amount: 4000, role: "(Pro)PlanUser" },
  business: { plan: "Business", amount: 3000, role: "enterpriseAdmin" },
};

/* Minimum seats required for Business plan */
const MIN_BUSINESS_SEATS = 5;

/* Generate MD5 hash in uppercase format for PayHere security validation */
const md5Upper = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();

/* Normalize merchant secret based on configured format (plain or base64) */
const normalizeSecret = (rawValue, format) => {
  const raw = String(rawValue || "").trim();
  const secretFormat = String(format || "plain").trim().toLowerCase();

  if (!raw) return "";

  if (secretFormat === "base64") {
    try {
      return Buffer.from(raw, "base64").toString("utf8").trim();
    } catch {
      return raw;
    }
  }

  /* plain text format */
  return raw;
};

/* Get normalized PayHere merchant secret from environment */
const getNormalizedMerchantSecret = () =>
  normalizeSecret(
    process.env.PAYHERE_MERCHANT_SECRET,
    process.env.PAYHERE_SECRET_FORMAT || "plain"
  );

/* Mobile checkouts are launched from a page our own backend server-renders
 * and auto-submits (see buildPayHerePayload/launchPayHereCheckout) - unlike
 * the web app, which builds and submits the form client-side directly from
 * the frontend origin. PayHere validates the checkout hash against the
 * secret registered for whichever domain the form was actually submitted
 * from, so the backend's own domain needs its own registered secret,
 * separate from the web/frontend domain's. Falls back to the default
 * secret so nothing changes until PAYHERE_MOBILE_MERCHANT_SECRET is set. */
const getNormalizedMobileMerchantSecret = () => {
  const raw = String(process.env.PAYHERE_MOBILE_MERCHANT_SECRET || "").trim();
  if (!raw) return getNormalizedMerchantSecret();

  return normalizeSecret(raw, process.env.PAYHERE_SECRET_FORMAT || "plain");
};

/* Determine PayHere checkout URL based on environment (sandbox vs production) */
const getCheckoutUrl = () => {
  const env = String(process.env.PAYHERE_ENV || "sandbox").trim().toLowerCase();

  if (env === "sandbox") return "https://sandbox.payhere.lk/pay/checkout";
  return "https://www.payhere.lk/pay/checkout";
};

/* Extract plan code from label string for backward compatibility */
const getPlanCodeFromLabel = (label) => {
  const value = String(label || "").trim().toLowerCase();

  if (value.includes("business")) return "business";
  if (value.includes("pro")) return "pro";

  return null;
};

/* Parse custom2 payload to extract plan and seat information */
const parseCustom2Payload = (custom2) => {
  const raw = String(custom2 || "").trim();
  if (!raw) {
    return null;
  }

  /* New deterministic format: planId:<id>|plan:<planName>|seats:<count> */
  const segments = raw.split("|");
  const kv = {};
  for (const segment of segments) {
    const [k, ...rest] = segment.split(":");
    const key = String(k || "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key && value) kv[key] = value;
  }

  if (kv.planid && PLAN_DETAILS[kv.planid]) {
    const parsedSeats = Number(kv.seats);
    return {
      planCode: kv.planid,
      plan: PLAN_DETAILS[kv.planid].plan,
      seats:
        kv.planid === "business" && Number.isFinite(parsedSeats)
          ? Math.max(MIN_BUSINESS_SEATS, Math.floor(parsedSeats))
          : kv.planid === "business"
            ? MIN_BUSINESS_SEATS
          : 1,
    };
  }

  // Backward compatibility with old payloads ("Personal", "Business", "Business|seats:2").
  const legacyPlanCode = getPlanCodeFromLabel(raw);
  if (!legacyPlanCode || !PLAN_DETAILS[legacyPlanCode]) {
    return null;
  }

  return {
    planCode: legacyPlanCode,
    plan: PLAN_DETAILS[legacyPlanCode].plan,
    seats: legacyPlanCode === "business" ? MIN_BUSINESS_SEATS : 1,
  };
};

const syncUserRoleFromPlanCode = async ({ userId, planCode }) => {
  const details = PLAN_DETAILS[planCode];
  if (!details) return;

  const user = await User.findById(userId);
  if (!user) return;

  user.role = details.role;

  if (details.role === "enterpriseAdmin") {
    let enterprise = await Enterprise.findOne({ ownerId: user._id });
    if (!enterprise) {
      enterprise = await Enterprise.create({
        name: `${user.name || "Business"} Workspace`,
        ownerId: user._id,
        members: [user._id],
      });
    } else if (!enterprise.members.some((memberId) => memberId.equals(user._id))) {
      enterprise.members.push(user._id);
      enterprise.updatedAt = new Date();
      await enterprise.save();
    }

    user.enterpriseId = enterprise._id;
  } else {
    user.enterpriseId = null;
  }

  await user.save();
};

const getMonthRange = () => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return { startDate, endDate };
};

const getSafeMobileReturnUrl = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^(seraniaiapp|exp|serani|http|https):\/\//i.test(trimmed) ? trimmed : null;
};

const extractSingleQueryParam = (value) => {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }
  return String(value || "").trim();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Amounts arrive from PayHere as formatted strings (e.g. "4000.00"). Compare
 * with a small epsilon instead of strict equality to tolerate rounding. */
const amountsMatch = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

/* Compute what we actually expect to be charged for a given plan/seat
 * combination, mirroring the pricing used when the payment was initialized. */
const getExpectedAmount = (planCode, seats) => {
  const plan = PLAN_DETAILS[planCode];
  if (!plan) return null;
  if (planCode === "business") {
    const seatCount = Math.max(MIN_BUSINESS_SEATS, Number(seats) || MIN_BUSINESS_SEATS);
    return plan.amount * seatCount;
  }
  return plan.amount;
};

const getBackendBaseUrl = (req) => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/+$/, "");
  }
  const host = req ? req.get("host") : null;
  const protocol = req ? (req.protocol || "http") : "http";
  if (host) {
    return `${protocol}://${host}`;
  }
  return "http://localhost:7001";
};

const appendQueryParams = (baseUrlStr, params = {}) => {
  try {
    const url = new URL(baseUrlStr);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  } catch {
    const joinChar = baseUrlStr.includes("?") ? "&" : "?";
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return queryString ? `${baseUrlStr}${joinChar}${queryString}` : baseUrlStr;
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPayHerePayload = (subscription, serverBase = "http://localhost:7001") => {
  const merchantId = String(process.env.PAYHERE_MERCHANT_ID || "").trim();
  // This function is exclusively reached via launchPayHereCheckout - the
  // server-rendered page the mobile app opens, which submits from our own
  // backend's domain - so it must sign with the mobile/backend-domain
  // secret, not the web/frontend-domain one used by the web app's direct
  // client-side form submission.
  const merchantSecret = getNormalizedMobileMerchantSecret();
  if (!merchantId || !merchantSecret) {
    return null;
  }

  const planCode = subscription.planCode || getPlanCodeFromLabel(subscription.plan);
  const plan = PLAN_DETAILS[planCode];
  if (!plan) {
    return null;
  }

  const amount = Number(subscription.amount || 0).toFixed(2);
  const currency = String(subscription.currency || "LKR").toUpperCase();
  const orderId = String(subscription.paymentId || subscription.orderId || "").trim();
  if (!orderId) {
    return null;
  }

  const merchantSecretMd5 = md5Upper(merchantSecret);
  const hash = md5Upper(
    `${merchantId}${orderId}${amount}${currency}${merchantSecretMd5}`
  );

  const returnUrl = `${serverBase}/api/billing/payhere/return`;
  const cancelUrl = `${serverBase}/api/billing/payhere/cancel`;

  return {
    merchant_id: merchantId,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url:
      process.env.PAYHERE_NOTIFY_URL ||
      `${serverBase}/api/billing/payhere/notify`,
    order_id: orderId,
    items:
      planCode === "business"
        ? `${plan.plan} Monthly Plan (${subscription.seats || MIN_BUSINESS_SEATS} seats)`
        : `${plan.plan} Monthly Plan`,
    currency,
    amount,
    first_name: subscription.userName || "Serani",
    last_name: "User",
    email: subscription.userEmail || "no-email@serani.ai",
    phone: "0000000000",
    address: "N/A",
    city: "Colombo",
    country: "Sri Lanka",
    custom_1: String(subscription.userId || ""),
    custom_2:
      planCode === "business"
        ? `planId:${planCode}|plan:${plan.plan}|seats:${subscription.seats || MIN_BUSINESS_SEATS}`
        : `planId:${planCode}|plan:${plan.plan}`,
    hash,
    actionUrl: getCheckoutUrl(),
  };
};

const renderPayHereLaunchPage = (payload) => {
  const hiddenInputs = Object.entries(payload)
    .filter(([key]) => key !== "actionUrl")
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to PayHere</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; text-align: center; background: #f8fafc; color: #0f172a; }
      .card { max-width: 420px; margin: 48px auto; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
      .spinner { width: 38px; height: 38px; border: 4px solid #dbeafe; border-top-color: #2563eb; border-radius: 999px; margin: 0 auto 18px; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      p { line-height: 1.5; color: #475569; }
      noscript button { margin-top: 18px; padding: 12px 18px; border: 0; border-radius: 999px; background: #2563eb; color: #fff; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h1>Redirecting to PayHere</h1>
      <p>Your payment page is loading now.</p>
      <form id="payhere-form" method="POST" action="${escapeHtml(payload.actionUrl)}">
        ${hiddenInputs}
      </form>
      <noscript>
        <p>JavaScript is required to continue.</p>
        <button type="submit" form="payhere-form">Continue</button>
      </noscript>
      <script>
        document.getElementById('payhere-form').submit();
      </script>
    </div>
  </body>
</html>`;
};

exports.initializePayHerePayment = async (req, res) => {
  try {
    const { planId, seats, returnUrl, cancelUrl } = req.body;
    const user = req.user;

    if (user?.role === "enterpriseUser") {
      return res.status(409).json({
        error:
          "You currently have enterprise premium access. Cancel your current premium access before upgrading to another plan.",
      });
    }

    const activeSubscription = await Subscription.findOne({
      userId: user?._id,
      status: "Active",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (activeSubscription) {
      return res.status(409).json({
        error:
          "You already have an active plan. Cancel your current subscription before upgrading to another plan.",
      });
    }

    const plan = PLAN_DETAILS[planId];
    if (!plan) {
      return res.status(400).json({
        error: "Invalid plan. Allowed plans: pro, business",
      });
    }

    const merchantId = String(process.env.PAYHERE_MERCHANT_ID || "").trim();
    const merchantSecret = getNormalizedMerchantSecret();

    if (!merchantId || !merchantSecret) {
      return res.status(500).json({
        error: "PayHere merchant configuration is missing",
      });
    }

    const seatCountRaw = Number(seats);
    const seatCount =
      planId === "business"
        ? Number.isFinite(seatCountRaw)
          ? Math.max(MIN_BUSINESS_SEATS, Math.floor(seatCountRaw))
          : MIN_BUSINESS_SEATS
        : 1;

    const unitAmount = Number(plan.amount);
    const totalAmount =
      planId === "business" ? unitAmount * seatCount : unitAmount;

    const orderId = `SERANI-${Date.now()}`;
    const amount = Number(totalAmount).toFixed(2);
    const currency = "LKR";

    const merchantSecretMd5 = md5Upper(merchantSecret);
    const hash = md5Upper(
      `${merchantId}${orderId}${amount}${currency}${merchantSecretMd5}`
    );

    const actionUrl = getCheckoutUrl();
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const serverBase = getBackendBaseUrl(req);

    const clientReturnUrl =
      getSafeMobileReturnUrl(returnUrl) ||
      process.env.PAYHERE_RETURN_URL ||
      `${frontendBase}/subscription?payment=success`;

    const clientCancelUrl =
      getSafeMobileReturnUrl(cancelUrl) ||
      process.env.PAYHERE_CANCEL_URL ||
      `${frontendBase}/subscription?payment=cancelled`;

    const payHereReturnUrl = `${serverBase}/api/billing/payhere/return`;
    const payHereCancelUrl = `${serverBase}/api/billing/payhere/cancel`;

    const payload = {
      merchant_id: merchantId,
      return_url: payHereReturnUrl,
      cancel_url: payHereCancelUrl,
      notify_url:
        process.env.PAYHERE_NOTIFY_URL ||
        `${serverBase}/api/billing/payhere/notify`,
      order_id: orderId,
      items:
        planId === "business"
          ? `${plan.plan} Monthly Plan (${seatCount} seats)`
          : `${plan.plan} Monthly Plan`,
      currency,
      amount,
      first_name: user?.name || "Serani",
      last_name: "User",
      email: user?.email || "no-email@serani.ai",
      phone: "0000000000",
      address: "N/A",
      city: "Colombo",
      country: "Sri Lanka",
      custom_1: String(user?._id || ""),
      custom_2:
        planId === "business"
          ? `planId:${planId}|plan:${plan.plan}|seats:${seatCount}`
          : `planId:${planId}|plan:${plan.plan}`,
      hash,
    };

    const { startDate, endDate } = getMonthRange();
    await Subscription.findOneAndUpdate(
      { paymentId: orderId },
      {
        userId: user?._id,
        userName: user?.name || "Serani",
        userEmail: user?.email || "no-email@serani.ai",
        plan: plan.plan,
        planCode: planId,
        seats: planId === "business" ? seatCount : 1,
        billingCycle: "Monthly",
        amount: Number(totalAmount),
        currency,
        status: "Pending",
        startDate,
        endDate,
        paymentId: orderId,
        method: "PayHere",
        returnUrl: clientReturnUrl,
        cancelUrl: clientCancelUrl,
        notifyUrl: payload.notify_url,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      actionUrl,
      checkoutUrl: `/api/billing/payhere/launch/${encodeURIComponent(orderId)}`,
      payload,
    });
  } catch (error) {
    return res.status(500).json({ error: "Payment initialization failed" });
  }
};

exports.launchPayHereCheckout = async (req, res) => {
  try {
    const orderId = String(req.params.orderId || "").trim();
    if (!orderId) {
      return res.status(400).send("orderId is required");
    }

    const subscription = await Subscription.findOne({ paymentId: orderId }).lean();
    if (!subscription) {
      return res.status(404).send("Subscription not found");
    }

    const serverBase = getBackendBaseUrl(req);
    const payload = buildPayHerePayload(subscription, serverBase);
    if (!payload) {
      return res.status(500).send("Unable to prepare PayHere checkout");
    }

    return res.status(200).set("Content-Type", "text/html").send(renderPayHereLaunchPage(payload));
  } catch (error) {
    return res.status(500).send("Unable to launch PayHere checkout");
  }
};

exports.handlePayHereReturnRedirect = async (req, res) => {
  try {
    const rawOrderId = req.query.order_id || req.query.orderId;
    const orderId = extractSingleQueryParam(rawOrderId);
    if (!orderId) {
      return res.status(400).send("order_id is required");
    }

    const subscription = await Subscription.findOne({ paymentId: orderId });
    if (!subscription) {
      return res.status(404).send("Subscription order not found");
    }

    // SECURITY: This is a public, unauthenticated GET endpoint reached via the
    // user's browser redirect from PayHere - it is not proof of payment (the
    // order_id is guessable and this route can be hit directly). Activation
    // only ever happens in handlePayHereNotify, which validates PayHere's
    // server-to-server md5 signature. This handler just sends the browser
    // back to the app; confirmPayHereReturn reports the real (webhook-driven)
    // status once the client lands back on the return URL.

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const clientReturnUrl =
      subscription.returnUrl ||
      process.env.PAYHERE_RETURN_URL ||
      `${frontendBase}/subscription?payment=success`;

    const targetUrlStr = appendQueryParams(clientReturnUrl, {
      payment: "success",
      order_id: orderId,
    });

    const isMobileScheme = /^(seraniaiapp|exp|serani):\/\//i.test(clientReturnUrl);

    if (isMobileScheme) {
      return res.status(200).set("Content-Type", "text/html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Successful - SeraniAI</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px 16px; text-align: center; background: #f8fafc; color: #0f172a; }
      .card { max-width: 400px; margin: 40px auto; background: #ffffff; border-radius: 24px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
      .icon { width: 56px; height: 56px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; font-weight: bold; }
      h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
      p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
      .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #2563eb; color: #ffffff; padding: 14px 20px; border-radius: 14px; font-weight: 700; text-decoration: none; font-size: 15px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✓</div>
      <h1>Payment Successful!</h1>
      <p>Your subscription is now active. Returning to SeraniAI app...</p>
      <a id="return-btn" href="${escapeHtml(targetUrlStr)}" class="btn">Open SeraniAI App</a>
    </div>
    <script>
      window.location.href = "${escapeHtml(targetUrlStr)}";
    </script>
  </body>
</html>`);
    }

    return res.redirect(targetUrlStr);
  } catch (error) {
    return res.status(500).send("Return redirection failed");
  }
};

exports.handlePayHereCancelRedirect = async (req, res) => {
  try {
    const rawOrderId = req.query.order_id || req.query.orderId;
    const orderId = extractSingleQueryParam(rawOrderId);
    if (!orderId) {
      return res.status(400).send("order_id is required");
    }

    const subscription = await Subscription.findOne({ paymentId: orderId });
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const clientCancelUrl =
      subscription?.cancelUrl ||
      process.env.PAYHERE_CANCEL_URL ||
      `${frontendBase}/subscription?payment=cancelled`;

    const targetUrlStr = appendQueryParams(clientCancelUrl, {
      payment: "cancelled",
      order_id: orderId,
    });

    const isMobileScheme = /^(seraniaiapp|exp|serani):\/\//i.test(clientCancelUrl);

    if (isMobileScheme) {
      return res.status(200).set("Content-Type", "text/html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment Cancelled - SeraniAI</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px 16px; text-align: center; background: #f8fafc; color: #0f172a; }
      .card { max-width: 400px; margin: 40px auto; background: #ffffff; border-radius: 24px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
      .icon { width: 56px; height: 56px; background: #fee2e2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; font-weight: bold; }
      h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
      p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
      .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #475569; color: #ffffff; padding: 14px 20px; border-radius: 14px; font-weight: 700; text-decoration: none; font-size: 15px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✕</div>
      <h1>Payment Cancelled</h1>
      <p>The payment process was cancelled. Returning to SeraniAI app...</p>
      <a id="return-btn" href="${escapeHtml(targetUrlStr)}" class="btn">Return to SeraniAI App</a>
    </div>
    <script>
      window.location.href = "${escapeHtml(targetUrlStr)}";
    </script>
  </body>
</html>`);
    }

    return res.redirect(targetUrlStr);
  } catch (error) {
    return res.status(500).send("Cancel redirection failed");
  }
};

exports.handlePayHereNotify = async (req, res) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id,
      subscription_id,
      subscriptionId,
      custom_1,
      custom_2,
    } = req.body;

    const configuredMerchantId = String(process.env.PAYHERE_MERCHANT_ID || "").trim();
    if (!configuredMerchantId || String(merchant_id || "").trim() !== configuredMerchantId) {
      return res.status(400).send("invalid merchant");
    }

    const merchantSecret = getNormalizedMerchantSecret();
    if (!merchantSecret) {
      return res.status(500).send("merchant secret missing");
    }

    const signWith = (secret) =>
      md5Upper(
        `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${md5Upper(
          secret
        )}`
      );

    // A notification's checkout could have been signed with either secret -
    // the web/frontend-domain one, or the mobile/backend-domain one (see
    // getNormalizedMobileMerchantSecret) - depending on which domain
    // actually submitted the checkout form. We can't tell which in advance,
    // so accept a match against either.
    const mobileSecret = getNormalizedMobileMerchantSecret();
    const providedSignature = String(md5sig || "").toUpperCase();
    const signatureValid =
      signWith(merchantSecret) === providedSignature ||
      (mobileSecret && mobileSecret !== merchantSecret && signWith(mobileSecret) === providedSignature);

    if (!signatureValid) {
      return res.status(400).send("invalid signature");
    }

    if (String(status_code) !== "2") {
      return res.status(200).send("ignored");
    }

    if (!custom_1 || !mongoose.Types.ObjectId.isValid(String(custom_1))) {
      return res.status(400).send("invalid user id");
    }

    const parsedAmount = Number(payhere_amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).send("invalid amount");
    }

    const currency = String(payhere_currency || "LKR").toUpperCase();
    if (currency !== "LKR") {
      return res.status(400).send("invalid currency");
    }

    const parsedPlanPayload = parseCustom2Payload(custom_2);
    if (!parsedPlanPayload) {
      return res.status(400).send("invalid plan payload");
    }

    const { planCode, plan, seats } = parsedPlanPayload;

    // SECURITY: Never trust the notified amount blindly - recompute what this
    // plan/seat combination should cost and reject anything that doesn't
    // match, so a tampered notification can't activate a plan for less (or
    // nothing).
    const expectedAmount = getExpectedAmount(planCode, seats);
    if (expectedAmount === null || !amountsMatch(parsedAmount, expectedAmount)) {
      return res.status(400).send("amount mismatch");
    }

    const { startDate, endDate } = getMonthRange();
    const paymentCandidates = [String(order_id || "").trim(), String(payment_id || "").trim()].filter(Boolean);

    await Subscription.findOneAndUpdate(
      { paymentId: { $in: paymentCandidates } },
      {
        userId: custom_1,
        plan,
        planCode,
        seats: planCode === "business" ? seats : 1,
        billingCycle: "Monthly",
        amount: parsedAmount,
        currency,
        status: "Active",
        subscriptionId: String(subscription_id || subscriptionId || "").trim() || undefined,
        payHereStatus: "ACTIVE",
        startDate,
        endDate,
        // SECURITY/CORRECTNESS: pin paymentId to our own order_id, not
        // PayHere's payment_id. This used to be `payment_id || order_id`,
        // which renamed the lookup key the instant this webhook landed -
        // silently breaking the browser return-redirect page and
        // confirmPayHereReturn's polling (both look the record up by the
        // original order_id) whenever the webhook won the race against the
        // browser's own redirect back, which it usually does once
        // PAYHERE_NOTIFY_URL is actually reachable. PayHere's own payment
        // reference is kept in payHerePaymentId instead.
        paymentId: String(order_id || payment_id),
        payHerePaymentId: String(payment_id || "").trim() || undefined,
        method: "PayHere",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await syncUserRoleFromPlanCode({ userId: custom_1, planCode });

    return res.status(200).send("ok");
  } catch (error) {
    return res.status(500).send("error");
  }
};

/* Number of times to re-check for activation, and the delay between checks.
 * Two independent things can activate a subscription while this endpoint
 * is polling: the notify webhook landing (fast DB re-read), or our own
 * PayHere Retrieval API lookup below finding a RECEIVED payment. Kept
 * short so the request doesn't hang. */
const CONFIRM_RETURN_POLL_ATTEMPTS = 3;
const CONFIRM_RETURN_POLL_DELAY_MS = 700;

/**
 * Independently verify (and, if confirmed, activate) a pending subscription
 * by asking PayHere directly whether the order was actually paid.
 *
 * SECURITY: this never trusts the browser return redirect. It calls
 * PayHere's Retrieval API (server-to-server, OAuth-authenticated) for the
 * order_id, and only activates when PayHere itself reports a "RECEIVED"
 * payment whose amount/currency match what this order was created for.
 * This exists alongside (not instead of) the signature-verified notify
 * webhook in handlePayHereNotify - notify is still the primary, fastest
 * path when reachable; this is what makes confirmation also work when
 * PAYHERE_NOTIFY_URL isn't publicly reachable (e.g. local development
 * without a tunnel), since this endpoint is called directly by the
 * authenticated client instead of waiting on an inbound webhook.
 */
const verifySubscriptionAgainstPayHere = async (subscription) => {
  if (subscription.status === "Active") {
    return subscription;
  }

  let payments;
  try {
    payments = await payHereService.getPaymentByOrderId(subscription.paymentId);
  } catch (error) {
    console.error(
      `PayHere payment verification failed for order ${subscription.paymentId}:`,
      error.response ? JSON.stringify(error.response.data) : error.message
    );
    return subscription;
  }

  const received = (payments || []).find(
    (p) =>
      String(p.order_id) === subscription.paymentId &&
      String(p.status || "").toUpperCase() === "RECEIVED"
  );

  if (!received) {
    return subscription;
  }

  if (
    !amountsMatch(received.amount, subscription.amount) ||
    String(received.currency || "").toUpperCase() !== String(subscription.currency || "").toUpperCase()
  ) {
    console.error(
      `PayHere payment amount/currency mismatch for order ${subscription.paymentId}: expected ${subscription.amount} ${subscription.currency}, got ${received.amount} ${received.currency}`
    );
    return subscription;
  }

  subscription.status = "Active";
  subscription.payHereStatus = "ACTIVE";
  // paymentId stays pinned to our own order_id (see handlePayHereNotify) -
  // PayHere's payment reference is recorded separately, for reference only.
  if (received.payment_id) {
    subscription.payHerePaymentId = String(received.payment_id);
  }
  await subscription.save();

  const planCode = PLAN_DETAILS[subscription.planCode]
    ? subscription.planCode
    : getPlanCodeFromLabel(subscription.plan);
  if (planCode) {
    await syncUserRoleFromPlanCode({ userId: subscription.userId, planCode });
  }

  return subscription;
};

exports.confirmPayHereReturn = async (req, res) => {
  try {
    const userId = req.user?._id;
    const orderId = String(req.body?.orderId || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    let subscription = await Subscription.findOne({
      userId,
      paymentId: orderId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Pending subscription not found" });
    }

    for (let attempt = 0; attempt < CONFIRM_RETURN_POLL_ATTEMPTS; attempt += 1) {
      if (subscription.status === "Active") break;

      // Fast path: has the signature-verified notify webhook already
      // landed since our last read?
      subscription = await Subscription.findOne({ userId, paymentId: orderId });
      if (!subscription) {
        return res.status(404).json({ message: "Pending subscription not found" });
      }
      if (subscription.status === "Active") break;

      // Otherwise, ask PayHere directly - this is what lets confirmation
      // complete even when the notify webhook can't reach us.
      subscription = await verifySubscriptionAgainstPayHere(subscription);
      if (subscription.status === "Active") break;

      if (attempt < CONFIRM_RETURN_POLL_ATTEMPTS - 1) {
        await wait(CONFIRM_RETURN_POLL_DELAY_MS);
      }
    }

    if (subscription.status !== "Active") {
      return res.status(202).json({
        message:
          "Payment received and is being confirmed. Your plan will update shortly.",
        pending: true,
        subscription,
      });
    }

    const updatedUser = await User.findById(userId).lean();

    return res.status(200).json({
      message: "Subscription payment confirmed",
      user: updatedUser,
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
};

// Exported so ad-hoc reconciliation tooling (and tests) can reuse the exact
// same PayHere-verified activation logic instead of duplicating it.
exports.verifySubscriptionAgainstPayHere = verifySubscriptionAgainstPayHere;

/**
 * @desc    Admin-only manual override: activate a subscription without
 *          going through PayHere verification at all.
 * @route   POST /api/subscriptions/:id/force-activate
 * @access  Private (admin)
 *
 * SECURITY: This intentionally bypasses PayHere entirely, so it must never
 * be reachable by anyone but an admin (enforced by the `authorize("admin")`
 * middleware on its route, same trust level as the existing subscription
 * Delete action) - unlike every other activation path in this file, this
 * one takes the caller's word for it. It exists as an escape hatch for
 * when PayHere's API is genuinely unreachable/misconfigured (e.g. a
 * sandbox app pending PayHere's own domain approval) and an admin has
 * independently confirmed the payment, not as a replacement for the
 * verified paths above.
 */
exports.forceActivateSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subscription id" });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscription.status === "Active") {
      return res.status(200).json({
        message: "Subscription is already active",
        data: subscription,
      });
    }

    const planCode = PLAN_DETAILS[subscription.planCode]
      ? subscription.planCode
      : getPlanCodeFromLabel(subscription.plan);

    if (!planCode) {
      return res.status(400).json({ message: "Unable to determine subscription plan" });
    }

    subscription.status = "Active";
    subscription.payHereStatus = "ACTIVE";
    await subscription.save();

    await syncUserRoleFromPlanCode({ userId: subscription.userId, planCode });

    // Basic audit trail - who force-activated what, since this bypasses
    // normal payment verification.
    console.warn(
      `[ADMIN OVERRIDE] Subscription ${subscription._id} (order ${subscription.paymentId}) force-activated by admin ${req.user?._id} (${req.user?.email})`
    );

    const [updatedUser, updatedSubscription] = await Promise.all([
      User.findById(subscription.userId).lean(),
      Subscription.findById(id).lean(),
    ]);

    return res.status(200).json({
      message: "Subscription force-activated",
      data: updatedSubscription,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Force activate error:", error.message);
    return res.status(500).json({ message: "Failed to force-activate subscription" });
  }
};

/* Only re-check orders old enough that the checkout-return flow (which
 * already polls confirmPayHereReturn a few times) has had a fair chance to
 * finish, and not so old that they're almost certainly abandoned carts. */
const PENDING_RECONCILE_MIN_AGE_MS = 2 * 60 * 1000; // 2 minutes
const PENDING_RECONCILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const PENDING_RECONCILE_BATCH_SIZE = 50;

/**
 * Safety net for subscriptions that never got activated through either of
 * the two request-driven paths:
 *  - the PayHere notify webhook (requires a publicly reachable
 *    PAYHERE_NOTIFY_URL - unreachable e.g. from localhost in local dev, or
 *    if it's ever briefly down/misconfigured), and
 *  - confirmPayHereReturn's short poll while the user's browser is still on
 *    the return page (misses cases like the tab being closed early, or
 *    PayHere not having recorded the payment as RECEIVED yet in that
 *    window).
 *
 * Without this, an order that both paths miss stays "Pending" forever with
 * nothing left to retry it, and the only recovery is an admin manually
 * force-activating it. Run periodically (see startPendingSubscriptionReconciliation
 * below); reuses the same PayHere-verified activation logic as everything
 * else, so nothing here activates a plan without PayHere itself confirming
 * a matching RECEIVED payment.
 */
const reconcilePendingSubscriptions = async () => {
  const now = Date.now();
  try {
    const pending = await Subscription.find({
      status: "Pending",
      paymentId: { $exists: true, $ne: "" },
      createdAt: {
        $lte: new Date(now - PENDING_RECONCILE_MIN_AGE_MS),
        $gte: new Date(now - PENDING_RECONCILE_MAX_AGE_MS),
      },
    }).limit(PENDING_RECONCILE_BATCH_SIZE);

    for (const subscription of pending) {
      await verifySubscriptionAgainstPayHere(subscription);
    }
  } catch (error) {
    console.error("Pending subscription reconciliation failed:", error.message);
  }
};

const PENDING_RECONCILE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let reconcileIntervalHandle = null;

/* Started once from server.js (only for the real running process, never
 * under tests/require()) so stuck-Pending orders keep getting retried in
 * the background instead of only at checkout-return time. */
const startPendingSubscriptionReconciliation = () => {
  if (reconcileIntervalHandle) return reconcileIntervalHandle;
  reconcileIntervalHandle = setInterval(reconcilePendingSubscriptions, PENDING_RECONCILE_INTERVAL_MS);
  reconcileIntervalHandle.unref?.();
  return reconcileIntervalHandle;
};

exports.reconcilePendingSubscriptions = reconcilePendingSubscriptions;
exports.startPendingSubscriptionReconciliation = startPendingSubscriptionReconciliation;