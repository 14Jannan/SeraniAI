const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const passport = require("passport");
require("./config/passport"); // ✅ VERY IMPORTANT (loads OAuth strategies)

dbConnect();

const app = express();

// =======================
// Middleware
// =======================

app.use(cors({
  origin: "http://localhost:5173", //Adjust this to your frontend URL
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize()); // Initialize passport

// =======================
// Routes
// =======================

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// =======================
// Start Server
// =======================

const PORT = process.env.PORT || 7001;

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});