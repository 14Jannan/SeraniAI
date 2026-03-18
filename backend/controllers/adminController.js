const User = require('../models/userModel')
const bcrypt = require('bcryptjs')

//GET ALL USERS
exports.getAllUsers = async (req,res)=>{
    try{
        const users = await User.find({}).select('-password');
        res.json(users);
    }catch(error){
        res.status(500).json({message: error.message});
    }
};

// CREATE USERS
exports.createUser = async (req, res)=>{
    const {name, email, password, role}=req.body;
    if(!name || !email || !password || !role){
            return res.status(400).json({message: "Please provide all fields"});
        }
    
    try{
        const userExists = await User.findOne({email});
        if(userExists){
            return res.status(400).json({message: "User already exists"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            isVerified: true,
        })

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    }catch (error){
        res.status(500).json({message: "Server Error"})
    }
};

//UPDATE USER
exports.updateUser = async(req,res)=>{
    try{
        const user = await User.findById(req.params.id);

        if(user){
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;

            if(req.body.password){
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
            })
        }else{
            res.status(404).json({message: "User not found"})
        }
    }catch(error){
        res.status(500).json({message:"Server Error"})
    }
}


//DELETE USER
exports.deleteUser = async(req,res)=>{
    try{
        const user = await User.findById(req.params.id);

        if(user){
            await user.deleteOne();
            res.json({message:"User removed"})
        }else{
            res.status(404).json({message:"User not found"})
        }
    }catch(error){
        res.status(500).json({message: "Server Error"})
    }
};