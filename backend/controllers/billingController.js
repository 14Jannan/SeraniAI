const crypto = require("crypto");
const mongoose = require("mongoose");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Enterprise = require("../models/enterpriseModel");

const PLAN_DETAILS = {
  pro: { plan: "Personal", amount: 4000, role: "(Pro)PlanUser" },
  business: { plan: "Business", amount: 3000, role: "enterpriseAdmin" },
};

const md5Upper = (value) =>
  crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();

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

  // plain
  return raw;
};

const getNormalizedMerchantSecret = () =>
  normalizeSecret(
    process.env.PAYHERE_MERCHANT_SECRET,
    process.env.PAYHERE_SECRET_FORMAT || "plain"
  );

const getCheckoutUrl = () => {
  const env = String(process.env.PAYHERE_ENV || "sandbox").trim().toLowerCase();

  // Required by you:
  // If using sandbox, post to https://sandbox.payhere.lk/pay/checkout
  if (env === "sandbox") return "https://sandbox.payhere.lk/pay/checkout";
  return "https://www.payhere.lk/pay/checkout";
};

const getPlanCodeFromLabel = (label) => {
  const value = String(label || "").trim().toLowerCase();

  if (value.includes("business")) return "business";
  if (value.includes("pro")) return "pro";

  return null;
};

const parseCustom2Payload = (custom2) => {
  const raw = String(custom2 || "").trim();
  if (!raw) {
    return null;
  }

  // New deterministic format: planId:<id>|plan:<planName>|seats:<count>
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
          ? Math.max(1, Math.floor(parsedSeats))
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
    seats: legacyPlanCode === "business" ? 1 : 1,
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

exports.initializePayHerePayment = async (req, res) => {
  try {
    const { planId, seats } = req.body;
    const user = req.user;

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
    const seatCount = Number.isFinite(seatCountRaw)
      ? Math.max(1, Math.floor(seatCountRaw))
      : 1;

    const unitAmount = Number(plan.amount);
    const totalAmount =
      planId === "business" ? unitAmount * seatCount : unitAmount;

    const orderId = `SERANI-${Date.now()}`;
    const amount = Number(totalAmount).toFixed(2);
    const currency = "LKR";

    // PayHere hash: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
    const merchantSecretMd5 = md5Upper(merchantSecret);
    const hash = md5Upper(
      `${merchantId}${orderId}${amount}${currency}${merchantSecretMd5}`
    );

    const actionUrl = getCheckoutUrl();
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";

    const payload = {
      merchant_id: merchantId,
      return_url:
        process.env.PAYHERE_RETURN_URL ||
        `${frontendBase}/subscription?payment=success`,
      cancel_url:
        process.env.PAYHERE_CANCEL_URL ||
        `${frontendBase}/subscription?payment=cancelled`,
      notify_url:
        process.env.PAYHERE_NOTIFY_URL ||
        "http://localhost:7001/api/billing/payhere/notify",
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
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ actionUrl, payload });
  } catch (error) {
    return res.status(500).json({ error: "Payment initialization failed" });
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

    return res.status(200).json({ message: "Subscription payment confirmed" });
  } catch (error) {
    return res.status(500).json({ message: "Payment confirmation failed" });
  }
};