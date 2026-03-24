require("./setup");
const request = require("supertest");
const app     = require("../app");
const Product = require("../models/product.model");

describe("GET /api/products", () => {
  beforeEach(async () => {
    await Product.create([
      { name: "Fresa",    price: 5000, category: "Frutal",  description: "Rico granizado", image: "/img/fresa.webp",    stock: 100, active: true  },
      { name: "Maracuyá", price: 5500, category: "Frutal",  description: "Tropical",       image: "/img/maracuya.webp", stock: 50,  active: true  },
      { name: "Inactivo", price: 4000, category: "Cremoso", description: "No disponible",  image: "/img/inactivo.webp", stock: 10,  active: false },
    ]);
  });

  it("lista solo productos activos", async () => {
    const res = await request(app).get("/api/products");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    res.body.forEach((p) => expect(p.active).toBe(true));
  });

  it("no expone productos inactivos", async () => {
    const res = await request(app).get("/api/products");
    const names = res.body.map((p) => p.name);
    expect(names).not.toContain("Inactivo");
  });
});
