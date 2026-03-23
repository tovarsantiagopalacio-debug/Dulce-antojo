const router         = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const validate       = require("../middleware/validate.middleware");
const { orderSchema }              = require("../validators/order.schema");
const { createOrder, myOrders }    = require("../controllers/order.controller");

router.post("/",   authMiddleware, validate(orderSchema), createOrder);
router.get("/my",  authMiddleware, myOrders);

module.exports = router;
