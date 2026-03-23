const router      = require("express").Router();
const rateLimit   = require("express-rate-limit");
const validate    = require("../middleware/validate.middleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validators/auth.schema");
const { register, login, forgotPassword, resetPassword } = require("../controllers/auth.controller");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
});

router.post("/register",       authLimiter, validate(registerSchema),       register);
router.post("/login",          authLimiter, validate(loginSchema),          login);
router.post("/forgot-password",authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema),  resetPassword);

module.exports = router;
