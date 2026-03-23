const express  = require("express");
const mongoose = require("mongoose");
const helmet   = require("helmet");
const cors     = require("cors");
require("dotenv").config();

// ─── VALIDACIÓN DE VARIABLES DE ENTORNO ───────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missingEnv   = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = ["http://localhost:3000", process.env.APP_URL].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origen no permitido: ${origin}`));
  },
  credentials: true,
}));

// ─── MIDDLEWARE GLOBAL ─────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static("public"));
app.use(express.json());

// ─── RUTAS API ─────────────────────────────────────────────────────────────────
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/auth",     require("./routes/auth.routes"));
app.use("/api/orders",   require("./routes/order.routes"));
app.use("/api/admin",    require("./routes/admin.routes"));

// ─── PÁGINAS ──────────────────────────────────────────────────────────────────
app.get("/admin",           (req, res) => res.sendFile(__dirname + "/public/admin.html"));
app.get("/mis-pedidos",     (req, res) => res.sendFile(__dirname + "/public/my-orders.html"));
app.get("/forgot-password", (req, res) => res.sendFile(__dirname + "/public/forgot-password.html"));
app.get("/reset-password",  (req, res) => res.sendFile(__dirname + "/public/reset-password.html"));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(__dirname + "/public/404.html"));

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor." });
});

// ─── BASE DE DATOS + INICIO ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
