const mongoose = require("mongoose"); // imports mongoose library

const dbConnect = async () => {
  try {
    const connectionString =
      process.env.CONNECTION_STRING ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/seraniai";

    const connect = await mongoose.connect(connectionString); // connect to mongodb using connection string
    console.log(
      // if connection is successful
      `Database Connected : ${connect.connection.host}, ${connect.connection.name}`,
    );
  } catch (err) {
    // Fail fast on the initial connection: booting anyway and silently
    // serving every request as a 500 is worse than not booting at all, and
    // makes the failure much harder to notice. Let the process manager
    // (Docker/PM2/systemd) restart us once the DB is reachable again.
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
};

// Surface connection drops that happen after the initial connect (network
// blip, Atlas maintenance, etc.) instead of only ever logging the first one.
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

module.exports = dbConnect;
