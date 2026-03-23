const Product = require("../models/product.model");
const Order   = require("../models/order.model");

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { products } = req.validatedBody;
    const userId = req.user.userId;

    const productIds = products.map((p) => p.product);
    const dbProducts = await Product.find({ _id: { $in: productIds }, active: { $ne: false } });

    if (dbProducts.length !== productIds.length) {
      return res.status(400).json({ message: "Uno o más productos no existen." });
    }

    for (const item of products) {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
      if (!dbProduct.unlimitedStock && dbProduct.stock !== null && dbProduct.stock !== undefined && dbProduct.stock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para "${dbProduct.name}". Disponible: ${dbProduct.stock}.`,
        });
      }
    }

    const totalAmount = products.reduce((sum, item) => {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
      return sum + dbProduct.price * item.quantity;
    }, 0);

    const newOrder = new Order({ user: userId, products, totalAmount });
    await newOrder.save();

    await Promise.all(
      products.map((item) => {
        const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
        if (!dbProduct.unlimitedStock && dbProduct.stock !== null && dbProduct.stock !== undefined) {
          return Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }
      })
    );

    res.status(201).json({ message: "Pedido realizado con éxito.", totalAmount });
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    res.status(500).json({ message: "Error en el servidor al crear el pedido." });
  }
};

// GET /api/orders/my
const myOrders = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const query = { user: req.user.userId };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "products.product", model: "Product", select: "name price" }),
      Order.countDocuments(query),
    ]);

    res.json({ orders, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ message: "Error al obtener el historial de pedidos." });
  }
};

module.exports = { createOrder, myOrders };
