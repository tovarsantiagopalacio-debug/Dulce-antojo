const { z } = require("zod");

const registerSchema = z.object({
  businessName: z.string().min(1, "El nombre del negocio es requerido."),
  email: z.string().email("Formato de correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

const loginSchema = z.object({
  email: z.string().email("Formato de correo inválido."),
  password: z.string().min(1, "La contraseña es requerida."),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Formato de correo inválido."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido."),
  newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
