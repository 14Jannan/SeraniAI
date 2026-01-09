const express = require("express");
const verifyToken = require("../middleware/authMiddleware")
const authorizeRoles = require("../middleware/roleMiddleware")
const router = express.Router();

// only admin can access this router
router.get("/admin",verifyToken, authorizeRoles("admin"),(req,res)=>{
    res.json({message:"Welcome Admin"})
})

// only enterprise can access this router
router.get("/enterprise",verifyToken,authorizeRoles("admin","enterprise"),(req,res)=>{
    res.json({message:"Welcome Enterprise User"})
})

// all can access this route
router.get("/user",verifyToken,authorizeRoles("admin","enterprise","user"),(req,res)=>{
    res.json({message:"Welcome User"})
})

module.exports=router;