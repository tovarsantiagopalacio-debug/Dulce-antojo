// Middleware reutilizable para validar req.body con un schema Zod
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Datos inválidos.";
    return res.status(400).json({ message });
  }
  req.validatedBody = result.data;
  next();
};

module.exports = validate;
