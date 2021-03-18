const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cart: {
        type: Object,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    paymentId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Order", orderSchema);