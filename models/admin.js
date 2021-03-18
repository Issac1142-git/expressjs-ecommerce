const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");


const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Invalid E-mail")
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 8
    },
    posts: [
         
       {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        }
        
]
    

});

adminSchema.pre("save", async function(next){
    if(this.password && this.isModified("password")){
       this.password =  await bcrypt.hash(this.password, 10);
    }
    next();
})

module.exports = mongoose.model("Admin", adminSchema);