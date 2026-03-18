// Check if the user has the required role
const authorize = (...roles) => {
    return (req, res, next) => {
      // Dev-only override: set environment variable DEV_ALLOW_ADMIN_OVERRIDE=true
      // and send header 'x-dev-admin: true' from your client to bypass role checks locally.
      // WARNING: keep this disabled in production.
      try {
        if (process.env.DEV_ALLOW_ADMIN_OVERRIDE === 'true' && req.headers['x-dev-admin'] === 'true') {
          req.user = req.user || {};
          req.user.role = 'admin';
        }
      } catch (e) {
        // ignore
      }
      // Ensure authMiddleware ran first and req.user exists
      if (!req.user) {
          return res.status(401).json({ message: 'User not authenticated' });
      }
  
      // Check if user's role is in the allowed list
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Role '${req.user.role}' is not authorized.` 
        });
      }
      
      next();
    };
  };
  
  module.exports = { authorize };