const crypto = require("crypto");
const mongoose = require("mongoose");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Enterprise = require("../models/enterpriseModel");

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
  const merchantSecret = getNormalizedMerchantSecret();
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

    if (subscription.status !== "Active") {
      subscription.status = "Active";
      await subscription.save();

      const planCode = PLAN_DETAILS[subscription.planCode]
        ? subscription.planCode
        : getPlanCodeFromLabel(subscription.plan);
      if (planCode) {
        await syncUserRoleFromPlanCode({ userId: subscription.userId, planCode });
      }
    }

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

    const localSignature = md5Upper(
      `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${md5Upper(
        merchantSecret
      )}`
    );

    if (localSignature !== String(md5sig || "").toUpperCase()) {
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
    const { startDate, endDate } = getMonthRange();
    const paymentCandidates = [String(payment_id || "").trim(), String(order_id || "").trim()].filter(Boolean);

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
        paymentId: String(payment_id || order_id),
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

    const subscription = await Subscription.findOne({
      userId,
      paymentId: orderId,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Pending subscription not found" });
    }

    if (subscription.status !== "Active") {
      subscription.status = "Active";
      await subscription.save();
    }

    const fallbackPlanCode = PLAN_DETAILS[subscription.planCode]
      ? subscription.planCode
      : getPlanCodeFromLabel(subscription.plan);
    if (!fallbackPlanCode) {
      return res.status(400).json({ message: "Unable to determine subscription plan" });
    }

    await syncUserRoleFromPlanCode({ userId, planCode: fallbackPlanCode });

    const [updatedUser, updatedSubscription] = await Promise.all([
      User.findById(userId).lean(),
      Subscription.findOne({ userId, paymentId: orderId }).lean(),
    ]);

    return res.status(200).json({
      message: "Subscription payment confirmed",
      user: updatedUser,
      subscription: updatedSubscription,
    });
  } catch (error) {
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
};