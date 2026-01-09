const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes")

dbConnect()

const app = express(); //create app

app.use(express.json()); //Middleware
app.use("/api/users",userRoutes)

//Routes
app.use("/api/auth", authRoutes);


//Start the server
const PORT = process.env.PORT || 7002;
app.listen(PORT, ()=>{
    console.log(`Server is running at ${PORT}`)
})