const mongoose = require('mongoose');
require('dotenv').config();

// Importamos el modelo de Producto que creamos antes
const Product = require('./models/product.model');
// Importamos los datos de nuestro archivo JSON
const productsData = require('./public/products.json');

// Función principal para conectar y sembrar la base de datos
const seedDatabase = async () => {
    try {
        // Conectamos a la base de datos (igual que en server.js)
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Conectado a MongoDB para la siembra.');

        // Opcional: Borramos todos los productos existentes para evitar duplicados si ejecutamos el script varias veces
        await Product.deleteMany({});
        console.log('🧹 Productos antiguos eliminados.');

        // Insertamos todos los productos del archivo JSON en la base de datos
        await Product.insertMany(productsData);
        console.log('🌱 ¡Base de datos sembrada con éxito!');

    } catch (error) {
        console.error('❌ Error al sembrar la base de datos:', error);
    } finally {
        // Cerramos la conexión a la base de datos
        mongoose.connection.close();
        console.log('🔌 Conexión cerrada.');
    }
};

// Ejecutamos la función
seedDatabase();