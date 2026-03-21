// middleware/admin.middleware.js
module.exports = function (req, res, next) {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado. Solo administradores." });
  }
  next();
};
