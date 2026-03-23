// seed-admin.js
// Crea o actualiza un usuario admin en la base de datos.
// Uso: node seed-admin.js
//
// Configura ADMIN_EMAIL y ADMIN_PASSWORD aquí abajo o vía variables de entorno.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/user.model");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dulceantojo.com";
const ADMIN_NAME  = process.env.ADMIN_NAME  || "Administrador";

if (!process.env.ADMIN_PASSWORD) {
  console.error("❌ Define ADMIN_PASSWORD en el .env antes de ejecutar este script.");
  process.exit(1);
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Conectado a MongoDB.");

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    // Si ya existe, solo asegura que tenga rol admin
    if (existing.role === "admin") {
      console.log(`ℹ️  El usuario ${ADMIN_EMAIL} ya es admin. No se hizo nada.`);
    } else {
      await User.updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin" } });
      console.log(`✅ Usuario ${ADMIN_EMAIL} promovido a admin.`);
    }
  } else {
    // Crear nuevo usuario admin
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      businessName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashed,
      role: "admin",
    });
    console.log(`✅ Admin creado:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  }

  await mongoose.disconnect();
  console.log("🔌 Desconectado. Listo.");
};

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
