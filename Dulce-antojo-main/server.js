// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const ExcelJS = require("exceljs");
require("dotenv").config();

const Product = require("./models/product.model");
const User = require("./models/user.model");
const Order = require("./models/order.model");
const authMiddleware = require("./middleware/auth.middleware");
const adminMiddleware = require("./middleware/admin.middleware");
const upload = require("./services/cloudinary.service");
const { sendResetEmail, sendWelcomeEmail } = require("./services/email.service");
const crypto = require("crypto");

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
    sendWelcomeEmail(email, businessName).catch(err => console.error("Error enviando email de bienvenida:", err));
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

// ─── RECUPERACIÓN DE CONTRASEÑA ───────────────────────────────────────────────

app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Respuesta genérica siempre (evita enumerar emails)
    if (!user) return res.json({ message: "Si el correo existe, recibirás un enlace en breve." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await sendResetEmail(user.email, `${appUrl}/reset-password?token=${rawToken}`);
    res.json({ message: "Si el correo existe, recibirás un enlace en breve." });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
});

app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Datos incompletos." });
    if (newPassword.length < 8) return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "El enlace es inválido o ha expirado." });

    user.password             = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Contraseña actualizada correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en reset-password:", error);
    res.status(500).json({ message: "Error al restablecer la contraseña." });
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
    // Validación de stock
    for (const item of products) {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
      if (dbProduct.stock !== null && dbProduct.stock !== undefined && dbProduct.stock < item.quantity) {
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
    // Descontar stock
    await Promise.all(products.map((item) => {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.product);
      if (dbProduct.stock !== null && dbProduct.stock !== undefined) {
        return Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }
    }));
    res.status(201).json({ message: "Pedido realizado con éxito.", totalAmount });
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    res.status(500).json({ message: "Error en el servidor al crear el pedido." });
  }
});

// Historial de pedidos del usuario autenticado
app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;
    const query = { user: req.user.userId };
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ orderDate: -1 }).skip(skip).limit(limit)
        .populate({ path: "products.product", model: "Product", select: "name price" }),
      Order.countDocuments(query),
    ]);
    res.json({ orders, total, currentPage: page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ message: "Error al obtener el historial de pedidos." });
  }
});

// ─── ADMIN — NUEVOS PEDIDOS (polling) ─────────────────────────────────────────

app.get("/api/admin/orders/count-new", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // últimas 2 horas
    const count = await Order.countDocuments({ status: "pendiente", orderDate: { $gte: since } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener conteo." });
  }
});

// ─── ADMIN — STATS ────────────────────────────────────────────────────────────

app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr = date || new Date().toISOString().split("T")[0];
    const start = new Date(dateStr + "T00:00:00.000Z");
    const end   = new Date(dateStr + "T23:59:59.999Z");
    const orders = await Order.find({ orderDate: { $gte: start, $lte: end } });
    const totalPedidos = orders.length;
    const totalVentas  = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pedidosPendientes = orders.filter(o => o.status === "pendiente").length;
    res.json({ totalPedidos, totalVentas, pedidosPendientes });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas." });
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
    const fileDateLabel = targetDate.toISOString().split("T")[0];

    const wb = new ExcelJS.Workbook();
    wb.creator = "Dulce Antojo";

    // ── Hoja 1: Resumen Empaque ──────────────────────────────────────────────
    const ws1 = wb.addWorksheet("Resumen Empaque");
    ws1.columns = [{ width: 38 }, { width: 20 }];

    // Título
    ws1.mergeCells("A1:B1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = `RESUMEN DE EMPAQUE — ${dateLabel.toUpperCase()}`;
    titleCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws1.getRow(1).height = 28;

    ws1.addRow([]);

    // Encabezados resumen
    const hdrRow1 = ws1.addRow(["SABOR", "CANTIDAD TOTAL"]);
    hdrRow1.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF34D399" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "FF6EE7B7" } } };
    });

    // Datos resumen
    const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    sortedTotals.forEach(([name, qty], i) => {
      const row = ws1.addRow([name, qty]);
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
        });
      }
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(2).font = { bold: true };
    });

    ws1.addRow([]);
    const totalRow = ws1.addRow(["TOTAL PEDIDOS", orders.length]);
    totalRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FF34D399" } };
    });

    // ── Hoja 2: Detalle Pedidos ──────────────────────────────────────────────
    const ws2 = wb.addWorksheet("Detalle Pedidos");
    ws2.columns = [
      { header: "HORA",     width: 12 },
      { header: "CLIENTE",  width: 30 },
      { header: "PRODUCTO", width: 30 },
      { header: "CANTIDAD", width: 12 },
      { header: "ESTADO",   width: 16 },
    ];

    // Estilizar fila de encabezados
    const hdrRow2 = ws2.getRow(1);
    hdrRow2.eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "medium", color: { argb: "FF34D399" } } };
    });
    hdrRow2.height = 22;

    // Datos detalle
    orders.forEach((order, oi) => {
      order.products.forEach((item) => {
        const row = ws2.addRow([
          new Date(order.orderDate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          order.user ? order.user.businessName : "Desconocido",
          item.product ? item.product.name : "Eliminado",
          item.quantity,
          order.status,
        ]);
        if (oi % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
          });
        }
        row.getCell(4).alignment = { horizontal: "center" };
        row.getCell(5).alignment = { horizontal: "center" };
      });
    });

    res.setHeader("Content-Disposition", `attachment; filename="pedidos-${fileDateLabel}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await wb.xlsx.write(res);
    res.end();
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
    const { name, category, description, price, image, active, stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, description, price, image, active, stock: stock !== undefined ? stock : null },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Producto no encontrado." });
    res.json({ message: "Producto actualizado.", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload de imagen a Cloudinary
app.post("/api/admin/upload", authMiddleware, adminMiddleware,
  upload.single("image"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo." });
    res.json({ url: req.file.path });
  }
);

// ─── PÁGINAS ──────────────────────────────────────────────────────────────────

app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

app.get("/mis-pedidos", (req, res) => {
  res.sendFile(__dirname + "/public/my-orders.html");
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(__dirname + "/public/forgot-password.html");
});

app.get("/reset-password", (req, res) => {
  res.sendFile(__dirname + "/public/reset-password.html");
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).sendFile(__dirname + "/public/404.html");
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
