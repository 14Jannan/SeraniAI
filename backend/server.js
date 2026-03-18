const express = require("express");
const path = require('path');
const cors = require("cors");
const dotenv = require("dotenv").config();
const cookieParser = require("cookie-parser");
require("dotenv").config();

const dbConnect = require("./config/dbConnect");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");

dbConnect();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
