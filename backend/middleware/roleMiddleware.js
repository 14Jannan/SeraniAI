// Check if the user has the required role
const authorize = (...roles) => {
    return (req, res, next) => {
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