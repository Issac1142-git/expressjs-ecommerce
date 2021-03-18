const mongoose = require("mongoose");


var productSchema = new mongoose.Schema({
    name: String,
    image: String,
    price: Number,
    description: String,
    seller: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin"
        },
        username: String
    },
    created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Product", productSchema);


