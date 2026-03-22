// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const XLSX = require("xlsx");
require("dotenv").config();

const Product = require("./models/product.model");
const User = require("./models/user.model");
const Order = require("./models/order.model");
const authMiddleware = require("./middleware/auth.middleware");
const adminMiddleware = require("./middleware/admin.middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Necesario en Railway para que rate-limit funcione detrás de proxy
app.set("trust proxy", 1);

// Seguridad
app.use(helmet({ contentSecurityPolicy: false }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
});

app.use(express.static("public"));
app.use(express.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({ active: { $ne: false } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { businessName, email, password } = req.body;
    if (!businessName || !email || !password) {
      return res.status(400).json({ message: "Todos los campos son requeridos." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Formato de correo inválido." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El correo electrónico ya está registrado." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ businessName, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Usuario registrado con éxito." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al registrar." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Credenciales incorrectas." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciales incorrectas." });
    }
    const payload = { userId: user._id, name: user.businessName, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      user: { businessName: user.businessName, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al iniciar sesión." });
  }
});

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────

app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const { products } = req.body;
    const userId = req.user.userId;
    if (!products || products.length === 0) {
      return res.status(400).json({ message: "Faltan datos en el pedido." });
    }
    const productIds = products.map((p) => p.product);
    const dbProducts = await Product.find({ _id: { $in: productIds }, active: { $ne: false } });
    if (dbProducts.length !== productIds.length) {
      return res.status(400).json({ message: "Uno o más productos no existen." });
    }
    const totalAmount = products.reduce((sum, item) => {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
      return sum + dbProduct.price * item.quantity;
    }, 0);
    const newOrder = new Order({ user: userId, products, totalAmount });
    await newOrder.save();
    res.status(201).json({ message: "Pedido realizado con éxito.", totalAmount });
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    res.status(500).json({ message: "Error en el servidor al crear el pedido." });
  }
});

// Historial de pedidos del usuario autenticado
app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .sort({ orderDate: -1 })
      .populate({ path: "products.product", model: "Product", select: "name price" });
    res.json(orders);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ message: "Error al obtener el historial de pedidos." });
  }
});

// ─── ADMIN — PEDIDOS ──────────────────────────────────────────────────────────

app.get("/api/admin/orders", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const query = {};
    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end   = new Date(date + "T23:59:59.999Z");
      query.orderDate = { $gte: start, $lte: end };
    }
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate("user", "businessName email")
      .populate({ path: "products.product", model: "Product", select: "name" });
    res.json(orders);
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ message: "Error en el servidor al obtener las órdenes." });
  }
});

// Exportar pedidos del día en Excel
app.get("/api/admin/orders/export", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date + "T12:00:00.000Z") : new Date();
    const start = new Date(date ? date + "T00:00:00.000Z" : new Date().toISOString().split("T")[0] + "T00:00:00.000Z");
    const end   = new Date(date ? date + "T23:59:59.999Z" : new Date().toISOString().split("T")[0] + "T23:59:59.999Z");

    const orders = await Order.find({ orderDate: { $gte: start, $lte: end } })
      .sort({ orderDate: 1 })
      .populate("user", "businessName")
      .populate({ path: "products.product", model: "Product", select: "name price" });

    // Resumen: total por sabor (para empaque)
    const totals = {};
    orders.forEach((order) => {
      order.products.forEach((item) => {
        const name = item.product ? item.product.name : "Producto eliminado";
        totals[name] = (totals[name] || 0) + item.quantity;
      });
    });

    const dateLabel = targetDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const resumenData = [
      [`RESUMEN DE EMPAQUE — ${dateLabel.toUpperCase()}`],
      [],
      ["SABOR", "CANTIDAD TOTAL"],
      ...Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, qty]) => [name, qty]),
      [],
      ["TOTAL PEDIDOS", orders.length],
    ];

    const detalleData = [
      ["HORA", "CLIENTE", "PRODUCTO", "CANTIDAD", "ESTADO"],
      ...orders.flatMap((order) =>
        order.products.map((item) => [
          new Date(order.orderDate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          order.user ? order.user.businessName : "Desconocido",
          item.product ? item.product.name : "Eliminado",
          item.quantity,
          order.status,
        ])
      ),
    ];

    const wb = XLSX.utils.book_new();
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 35 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Empaque");
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    wsDetalle["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Pedidos");

    const fileDateLabel = targetDate.toISOString().split("T")[0];
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename="pedidos-${fileDateLabel}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error exportando Excel:", error);
    res.status(500).json({ message: "Error al exportar." });
  }
});

app.patch("/api/admin/orders/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pendiente", "completado", "cancelado"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado." });
    res.json({ message: "Estado actualizado.", order });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el estado." });
  }
});

// ─── ADMIN — PRODUCTOS ────────────────────────────────────────────────────────

// Listar todos (incluye inactivos) para el panel admin
app.get("/api/admin/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos." });
  }
});

app.post("/api/admin/products", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, description, price, image } = req.body;
    const product = new Product({ name, category, description, price, image });
    await product.save();
    res.status(201).json({ message: "Producto creado.", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/admin/products/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, description, price, image, active } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, description, price, image, active },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Producto no encontrado." });
    res.json({ message: "Producto actualizado.", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── PÁGINAS ──────────────────────────────────────────────────────────────────

app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

app.get("/mis-pedidos", (req, res) => {
  res.sendFile(__dirname + "/public/my-orders.html");
});

// ─── ERROR HANDLER CENTRALIZADO ───────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor." });
});

// ─── INICIO ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
