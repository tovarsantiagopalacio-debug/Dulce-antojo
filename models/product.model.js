// models/product.model.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Ya no necesitamos un 'id' numérico. Mongoose gestionará el '_id' por nosotros.
    name: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    priceFormatted: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        required: true 
    }
});

module.exports = mongoose.model('Product', productSchema);