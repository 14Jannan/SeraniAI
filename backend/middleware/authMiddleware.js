const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Not authorized, token expired" });
      }

      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Not authorized, invalid token" });
      }

      console.error("JWT verify error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
