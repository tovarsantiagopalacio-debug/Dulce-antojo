// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- Importamos todos los modelos y el middleware ---
const Product = require('./models/product.model');
const User = require('./models/user.model');
const Order = require('./models/order.model');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.static('public'));
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));


// --- RUTAS DE API ---

// API para obtener productos (pública)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        // Mapear y añadir el campo de precio formateado
        const formattedProducts = products.map(p => {
            const productObject = p.toObject ? p.toObject() : p;
            return {
                ...productObject,
                priceFormatted: new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0
                }).format(productObject.price)
            };
        });
        res.json(formattedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// --- RUTAS DE AUTENTICACIÓN ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { businessName, email, password } = req.body;
        if (!businessName || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son requeridos.' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ businessName, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado con éxito.' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al registrar.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales incorrectas.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales incorrectas.' });
        }
        const payload = { userId: user._id, name: user.businessName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            message: 'Inicio de sesión exitoso.',
            token,
            user: { businessName: user.businessName, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
    }
});

// --- RUTA PARA CREAR PEDIDOS ---
app.post('/api/orders', authMiddleware, async (req, res) => {
    try {
        const { products, totalAmount } = req.body;
        const userId = req.user.userId;
        if (!products || products.length === 0 || !totalAmount) {
            return res.status(400).json({ message: 'Faltan datos en el pedido.' });
        }
        const newOrder = new Order({ user: userId, products, totalAmount });
        await newOrder.save();
        res.status(201).json({ message: 'Pedido realizado con éxito.' });
    } catch (error) {
        console.error('Error al crear el pedido:', error);
        res.status(500).json({ message: 'Error en el servidor al crear el pedido.' });
    }
});


// --- RUTAS PARA EL PANEL DE ADMINISTRACIÓN ---

// 1. Ruta de API para obtener todos los pedidos (protegida)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ orderDate: -1 })
            .populate('user', 'businessName email')
            .populate('products.product', 'name');

        res.json(orders);
    } catch (error) {
        console.error("Error al obtener las órdenes:", error);
        res.status(500).json({ message: "Error en el servidor al obtener las órdenes." });
    }
});

// 2. Ruta para servir la página de administración
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});