// models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['Frutal', 'Cremoso'],
    },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: {
        type: String,
        required: true,
        validate: {
            validator: (v) => /^(https?:\/\/.+|\/img\/.+)/.test(v),
            message: 'La imagen debe ser una URL (https://...) o ruta local (/img/...).',
        },
    },
    active:         { type: Boolean, default: true },
    stock:          { type: Number, default: 0, min: 0 },
    unlimitedStock: { type: Boolean, default: false }, // true = sin límite de stock
});

productSchema.index({ active: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);