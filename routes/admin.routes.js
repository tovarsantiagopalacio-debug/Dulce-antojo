const router         = require("express").Router();
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware= require("../middleware/admin.middleware");
const validate       = require("../middleware/validate.middleware");
const { productSchema, updateProductSchema } = require("../validators/product.schema");
const {
  countNewOrders, getStats, listOrders, exportOrders,
  updateOrderStatus, listProducts, createProduct, updateProduct, uploadImage,
} = require("../controllers/admin.controller");

// Aplicar auth + admin a todas las rutas de este router
router.use(authMiddleware, adminMiddleware);

router.get("/orders/count-new",       countNewOrders);
router.get("/stats",                  getStats);
router.get("/orders/export",          exportOrders);
router.get("/orders",                 listOrders);
router.patch("/orders/:id/status",    updateOrderStatus);
router.get("/products",               listProducts);
router.post("/products",              validate(productSchema), createProduct);
router.put("/products/:id",           validate(updateProductSchema), updateProduct);
router.post("/upload",                ...uploadImage);

module.exports = router;
