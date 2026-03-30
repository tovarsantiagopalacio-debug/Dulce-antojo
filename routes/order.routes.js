const router         = require("express").Router();
const rateLimit      = require("express-rate-limit");
const authMiddleware = require("../middleware/auth.middleware");
const validate       = require("../middleware/validate.middleware");
const { orderSchema }              = require("../validators/order.schema");
const { createOrder, myOrders }    = require("../controllers/order.controller");

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Demasiados pedidos. Intenta de nuevo en una hora." },
});

router.post("/",   authMiddleware, orderLimiter, validate(orderSchema), createOrder);
router.get("/my",  authMiddleware, myOrders);

module.exports = router;
