const mongoose = require("mongoose"); // imports mongoose library
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // use google dns for relaiable dns resolution( fixes mongodb connection issues)

const dbConnect = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION_STRING); // connect to mongodb using connection string
    console.log(
      // if connection is successful
      `Database Connected : ${connect.connection.host}, ${connect.connection.name}`,
    );
  } catch (err) {
    // if connection fails
    console.log("Database connection failed:", err.message);
    
  }
};
module.exports = dbConnect;
