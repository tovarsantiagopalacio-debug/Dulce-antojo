// models/order.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    // Quién hizo el pedido. Hacemos referencia al modelo 'User'.
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Qué productos pidió. Será un array de objetos.
    products: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    // Cuál fue el monto total.
    totalAmount: {
        type: Number,
        required: true
    },
    // Cuándo se hizo el pedido.
    orderDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);