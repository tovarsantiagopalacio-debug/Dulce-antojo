const { z } = require("zod");

const productSchema = z.object({
  name:         z.string().min(1, "El nombre es requerido."),
  category:     z.enum(["Frutal", "Cremoso"], { errorMap: () => ({ message: "Categoría inválida. Debe ser Frutal o Cremoso." }) }),
  description:  z.string().min(1, "La descripción es requerida."),
  price:        z.number({ invalid_type_error: "El precio debe ser un número." }).min(0, "El precio no puede ser negativo."),
  image:        z.string().optional(),
  active:       z.boolean().optional(),
  stock:        z.number().int().min(0).nullable().optional(),
  unlimitedStock: z.boolean().optional(),
});

module.exports = { productSchema };
