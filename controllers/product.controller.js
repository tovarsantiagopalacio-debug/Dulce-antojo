const Product = require("../models/product.model");

// GET /api/products
const listProducts = async (req, res) => {
  try {
    const products = await Product.find({ active: { $ne: false } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

module.exports = { listProducts };
