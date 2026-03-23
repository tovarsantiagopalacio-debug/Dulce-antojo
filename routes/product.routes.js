const router             = require("express").Router();
const { listProducts }   = require("../controllers/product.controller");

router.get("/", listProducts);

module.exports = router;
