// Lightweight in-memory rate limiter for sensitive auth endpoints
// (login, OTP verify/resend, password reset). Intentionally dependency-free
// so it needs no extra install; a single process is all this app runs as
// today. If the app is ever scaled horizontally behind a load balancer,
// swap this for a shared-store limiter (e.g. Redis-backed) since in-memory
// counters don't sync across instances.

const buckets = new Map();

// Periodically drop expired buckets so memory doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Create a rate-limiting middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds.
 * @param {number} options.max - Max requests allowed per key within the window.
 * @param {string} options.message - Response message when the limit is hit.
 * @param {(req) => string} [options.keyGenerator] - Derive the bucket key from the request (defaults to IP + route).
 */
function rateLimit({ windowMs, max, message = "Too many requests, please try again later.", keyGenerator } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator
      ? keyGenerator(req)
      : `${req.ip}:${req.baseUrl}${req.path}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }

    next();
  };
}

// Reset all buckets - exposed for tests only.
rateLimit._reset = () => buckets.clear();

module.exports = rateLimit;
