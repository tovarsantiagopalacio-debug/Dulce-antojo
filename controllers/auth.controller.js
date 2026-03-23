const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const User     = require("../models/user.model");
const { sendResetEmail, sendWelcomeEmail } = require("../services/email.service");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { businessName, email, password } = req.validatedBody;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El correo electrónico ya está registrado." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ businessName, email, password: hashedPassword });
    await newUser.save();
    sendWelcomeEmail(email, businessName).catch((err) =>
      console.error("Error enviando email de bienvenida:", err)
    );
    res.status(201).json({ message: "Usuario registrado con éxito." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al registrar." });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciales incorrectas." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Credenciales incorrectas." });
    const payload = { userId: user._id, name: user.businessName, role: user.role };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      user: { businessName: user.businessName, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor al iniciar sesión." });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.validatedBody;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "Si el correo existe, recibirás un enlace en breve." });

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken   = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    await sendResetEmail(user.email, `${appUrl}/reset-password?token=${rawToken}`);
    res.json({ message: "Si el correo existe, recibirás un enlace en breve." });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ message: "Error al procesar la solicitud." });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.validatedBody;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
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
};

module.exports = { register, login, forgotPassword, resetPassword };
