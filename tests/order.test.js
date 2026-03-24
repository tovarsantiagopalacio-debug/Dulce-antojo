require("./setup");
const request = require("supertest");
const app     = require("../app");
const Product = require("../models/product.model");

async function registerAndLogin() {
  await request(app).post("/api/auth/register").send({
    businessName: "Order User", email: "order@test.com", password: "Password123!",
  });
  const res = await request(app).post("/api/auth/login").send({
    email: "order@test.com", password: "Password123!",
  });
  return res.body.token;
}

describe("POST /api/orders", () => {
  let token;
  let productId;

  beforeEach(async () => {
    token = await registerAndLogin();
    const p = await Product.create({
      name: "Limón", price: 5000, category: "Frutal",
      description: "Granizado de limón", image: "/img/limon.webp", stock: 10, active: true,
    });
    productId = p._id.toString();
  });

  it("crea un pedido y descuenta stock", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ products: [{ product: productId, quantity: 2 }] });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("totalAmount");

    const updated = await Product.findById(productId);
    expect(updated.stock).toBe(8);
  });

  it("rechaza pedido sin token", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ products: [{ product: productId, quantity: 1 }] });
    expect(res.statusCode).toBe(401);
  });

  it("rechaza pedido si stock insuficiente", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ products: [{ product: productId, quantity: 99 }] });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/orders/my", () => {
  it("rechaza acceso sin token", async () => {
    const res = await request(app).get("/api/orders/my");
    expect(res.statusCode).toBe(401);
  });

  it("devuelve historial vacío para usuario nuevo", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/orders/my")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("orders");
    expect(Array.isArray(res.body.orders)).toBe(true);
  });
});
