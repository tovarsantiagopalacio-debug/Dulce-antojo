// models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    // --- NUEVO CAMPO PARA EL ROL ---
    role: {
        type: String,
        enum: ['user', 'admin'], // Solo puede ser 'user' o 'admin'
        default: 'user' // Por defecto, todos los nuevos registros son 'user'
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;