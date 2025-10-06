// seed.js
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/product.model');
const productsData = require('./public/products.json');

const seedDatabase = async () => {
    try {
        // Conexión simplificada y moderna a la base de datos
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB para la siembra.');

        // Borramos los productos antiguos
        await Product.deleteMany({});
        console.log('🧹 Productos antiguos eliminados.');
        
        // El 'id' numérico del JSON será ignorado y MongoDB creará el '_id'
        await Product.insertMany(productsData);
        console.log('🌱 ¡Base de datos sembrada con éxito!');

    } catch (error) {
        console.error('❌ Error al sembrar la base de datos:', error);
    } finally {
        // Cerramos la conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada.');
    }
};

seedDatabase();