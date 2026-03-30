const express  = require("express");
const helmet   = require("helmet");
const cors     = require("cors");
const path     = require("path");

const app = express();

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.static(path.join(__dirname, "public")));
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

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(__dirname + "/public/404.html"));

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Error interno del servidor." });
});

module.exports = app;
