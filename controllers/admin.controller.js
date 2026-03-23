const ExcelJS  = require("exceljs");
const Product  = require("../models/product.model");
const Order    = require("../models/order.model");
const upload   = require("../services/cloudinary.service");

// GET /api/admin/orders/count-new
const countNewOrders = async (req, res) => {
  try {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const count = await Order.countDocuments({ status: "pendiente", orderDate: { $gte: since } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener conteo." });
  }
};

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr  = date || new Date().toISOString().split("T")[0];
    const start    = new Date(dateStr + "T00:00:00.000Z");
    const end      = new Date(dateStr + "T23:59:59.999Z");
    const orders   = await Order.find({ orderDate: { $gte: start, $lte: end } });
    res.json({
      totalPedidos:      orders.length,
      totalVentas:       orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      pedidosPendientes: orders.filter((o) => o.status === "pendiente").length,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener estadísticas." });
  }
};

// GET /api/admin/orders
const listOrders = async (req, res) => {
  try {
    const { date } = req.query;
    const query    = {};
    if (date) {
      query.orderDate = {
        $gte: new Date(date + "T00:00:00.000Z"),
        $lte: new Date(date + "T23:59:59.999Z"),
      };
    }
    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate("user", "businessName email")
      .populate({ path: "products.product", model: "Product", select: "name" });
    res.json(orders);
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ message: "Error en el servidor al obtener las órdenes." });
  }
};

// GET /api/admin/orders/export
const exportOrders = async (req, res) => {
  try {
    const { date }   = req.query;
    const targetDate = date ? new Date(date + "T12:00:00.000Z") : new Date();
    const start      = new Date(date ? date + "T00:00:00.000Z" : new Date().toISOString().split("T")[0] + "T00:00:00.000Z");
    const end        = new Date(date ? date + "T23:59:59.999Z" : new Date().toISOString().split("T")[0] + "T23:59:59.999Z");

    const orders = await Order.find({ orderDate: { $gte: start, $lte: end } })
      .sort({ orderDate: 1 })
      .populate("user", "businessName")
      .populate({ path: "products.product", model: "Product", select: "name price" });

    const totals = {};
    orders.forEach((order) => {
      order.products.forEach((item) => {
        const name    = item.product ? item.product.name : "Producto eliminado";
        totals[name]  = (totals[name] || 0) + item.quantity;
      });
    });

    const dateLabel     = targetDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const fileDateLabel = targetDate.toISOString().split("T")[0];

    const wb  = new ExcelJS.Workbook();
    wb.creator = "Dulce Antojo";

    // Hoja 1: Resumen Empaque
    const ws1 = wb.addWorksheet("Resumen Empaque");
    ws1.columns = [{ width: 38 }, { width: 20 }];
    ws1.mergeCells("A1:B1");
    const titleCell = ws1.getCell("A1");
    titleCell.value     = `RESUMEN DE EMPAQUE — ${dateLabel.toUpperCase()}`;
    titleCell.font      = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    titleCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws1.getRow(1).height = 28;
    ws1.addRow([]);
    const hdrRow1 = ws1.addRow(["SABOR", "CANTIDAD TOTAL"]);
    hdrRow1.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF34D399" } };
      cell.alignment = { horizontal: "center" };
      cell.border    = { bottom: { style: "thin", color: { argb: "FF6EE7B7" } } };
    });
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, qty], i) => {
        const row = ws1.addRow([name, qty]);
        if (i % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } }; });
        row.getCell(2).alignment = { horizontal: "center" };
        row.getCell(2).font      = { bold: true };
      });
    ws1.addRow([]);
    const totalRow = ws1.addRow(["TOTAL PEDIDOS", orders.length]);
    totalRow.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FF34D399" } }; });

    // Hoja 2: Detalle Pedidos
    const ws2 = wb.addWorksheet("Detalle Pedidos");
    ws2.columns = [
      { header: "HORA",     width: 12 },
      { header: "CLIENTE",  width: 30 },
      { header: "PRODUCTO", width: 30 },
      { header: "CANTIDAD", width: 12 },
      { header: "ESTADO",   width: 16 },
    ];
    const hdrRow2 = ws2.getRow(1);
    hdrRow2.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
      cell.alignment = { horizontal: "center" };
      cell.border    = { bottom: { style: "medium", color: { argb: "FF34D399" } } };
    });
    hdrRow2.height = 22;
    orders.forEach((order, oi) => {
      order.products.forEach((item) => {
        const row = ws2.addRow([
          new Date(order.orderDate).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
          order.user ? order.user.businessName : "Desconocido",
          item.product ? item.product.name : "Eliminado",
          item.quantity,
          order.status,
        ]);
        if (oi % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } }; });
        row.getCell(4).alignment = { horizontal: "center" };
        row.getCell(5).alignment = { horizontal: "center" };
      });
    });

    res.setHeader("Content-Disposition", `attachment; filename="pedidos-${fileDateLabel}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando Excel:", error);
    res.status(500).json({ message: "Error al exportar." });
  }
};

// PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!["pendiente", "completado", "cancelado"].includes(status)) {
    return res.status(400).json({ message: "Estado inválido." });
  }
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Pedido no encontrado." });
    res.json({ message: "Estado actualizado.", order });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el estado." });
  }
};

// GET /api/admin/products
const listProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos." });
  }
};

// POST /api/admin/products
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.validatedBody);
    await product.save();
    res.status(201).json({ message: "Producto creado.", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/admin/products/:id
const updateProduct = async (req, res) => {
  try {
    const { name, category, description, price, image, active, stock, unlimitedStock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, description, price, image, active, stock: stock !== undefined ? stock : null, unlimitedStock },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Producto no encontrado." });
    res.json({ message: "Producto actualizado.", product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/admin/upload
const uploadImage = [
  upload.single("image"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo." });
    res.json({ url: req.file.path });
  },
];

module.exports = { countNewOrders, getStats, listOrders, exportOrders, updateOrderStatus, listProducts, createProduct, updateProduct, uploadImage };
