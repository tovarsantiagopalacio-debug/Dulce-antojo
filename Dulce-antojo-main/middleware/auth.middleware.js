// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Obtener el token del encabezado de la petición
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'No hay token, autorización denegada.' });
    }

    try {
        // El token viene en el formato "Bearer <token>", necesitamos separar el token real.
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Formato de token inválido.' });
        }

        // Verificamos que el token sea válido usando la clave secreta del archivo .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Agregamos la información del usuario (que viene en el token) al objeto 'req'
        // para que la siguiente función (la ruta de /api/orders) pueda usarla.
        req.user = decoded;
        
        // Le decimos a Express que continúe a la siguiente función
        next();
    } catch (error) {
        res.status(401).json({ message: 'El token no es válido.' });
    }
};