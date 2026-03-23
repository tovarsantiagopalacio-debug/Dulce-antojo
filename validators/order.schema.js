const { z } = require("zod");

const orderSchema = z.object({
  products: z
    .array(
      z.object({
        product:  z.string().min(1, "ID de producto requerido."),
        quantity: z.number({ invalid_type_error: "La cantidad debe ser un número." }).int().min(1, "La cantidad debe ser al menos 1."),
      })
    )
    .min(1, "El pedido debe tener al menos un producto."),
});

module.exports = { orderSchema };
