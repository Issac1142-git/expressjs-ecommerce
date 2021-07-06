const mongoose = require("mongoose");
const { default: validator } = require("validator");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Invalid Email")
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        trim: true
    }

});

userSchema.pre("save", async function (next) {
    if (this.password && this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

// userSchema.methods.findByCredentials = async function(email, password){
//     const user = await User.findOne({email});
//     if(!user){
//         throw new Error("Unable to Login")
//     }
//     const verifyPassword = await bcrypt.compare(password, user.password);
//     if(!verifyPassword){
//         throw new Error("Unable to login")
//     }
//     return user;
// }

module.exports = mongoose.model("User", userSchema);