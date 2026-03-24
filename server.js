require("dotenv").config();
const mongoose = require("mongoose");

// ─── VALIDACIÓN DE VARIABLES DE ENTORNO ───────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missingEnv   = REQUIRED_ENV.filter((v) => !process.env[v]);
if (missingEnv.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app  = require("./app");
const PORT = process.env.PORT || 3000;

// ─── BASE DE DATOS + INICIO ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
    process.exit(1);
  });
