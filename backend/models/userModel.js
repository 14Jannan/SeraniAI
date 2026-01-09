const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username : {
        type: String,
        required: true,
        unique: true
    },
    email:{
        type: String,
        required:true,
        unique: true,
        lowercase:true,
        trim:true

    },
    password: {
        type: String,
        required: true,
    },
    role:{
        type: String,
        required: true,
        enum: ["admin","user","enterprise"],
        default:"user"
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    verificationToken:{
        type: String
    }
},{
    timestamps: true,
}
);
module.exports = mongoose.model("User",userSchema)