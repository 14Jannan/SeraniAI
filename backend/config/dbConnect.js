const mongoose = require("mongoose");
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const dbConnect = async ()=>{
    
    try{
        const connect = await mongoose.connect(process.env.CONNECTION_STRING)
        console.log(`Database Connected : ${connect.connection.host}, ${connect.connection.name}`)
    }catch(err){
        console.log(err);
        process.exit(1);
    }
    
};
module.exports = dbConnect;