const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/userModel")
const sendVerificationEmail = require("../utils/emailService")

//Register
const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex")

        // FIX IS HERE: Added 'email' to the object
        const newUser = new User({
            username, 
            email, 
            password: hashedPassword, 
            role, 
            verificationToken, 
            isVerified: false
        })

        await newUser.save();

        await sendVerificationEmail(email, verificationToken);
        res.status(201).json({ message: `User registered. Verification email sent to ${email}` })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: "something went wrong" })
    }
}

const login=async (req,res)=>{
    try{
        const {email, password}=req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(404).json({message: `User with email ${email} not found`})
        }
        if(!user.isVerified){
            return res.status(401).json({message:"Please verify your email before logging in"})
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).json({message: `Invalid credentails`})
        }
        const token = jwt.sign(
            {id:user._id, role: user.role}, process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        res.status(200).json({token})

    }catch(err){
        res.status(500).json({message:"something went wrong"})
    }
    
}
const verifyEmail = async (req,res)=>{
    try{
        const {token} = req.params;
        const user = await User.findOne({verificationToken:token})

        if(!user){
            return res.status(400).json({message:"Invalid or expired token"})
        }

        user.isVerified = true;
        user.verificationToken = undefined; //clear the token
        await user.save();

        res.status(200).json({message:"email verified successfully! you can now login"})
    }catch(err){
        res.status(500).json({message:"Something went wrong"})
    }
}


module.exports={
    register,
    login,
    verifyEmail

}