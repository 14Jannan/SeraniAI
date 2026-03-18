const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv").config();
const cookieParser = require("cookie-parser");
const passport = require("passport");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");
require("./config/passport"); // Load passport configuration

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const journalRoutes = require("./routes/journalRoutes");

dbConnect();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/journals", journalRoutes);

// Start the server
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
