const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes")
const adminRoutes = require("./routes/adminRoutes"); 

dbConnect()

const app = express(); //create app
app.use(cors()); 
app.use(express.json()); //Middleware
app.use("/api/users",userRoutes)

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); 


//Start the server
const PORT = process.env.PORT || 7001;
app.listen(PORT, ()=>{
    console.log(`Server is running at ${PORT}`)
})