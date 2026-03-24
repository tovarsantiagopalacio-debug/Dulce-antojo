require("./setup");
const request = require("supertest");
const app     = require("../app");
const User    = require("../models/user.model");
const bcrypt  = require("bcryptjs");

async function loginAsAdmin() {
  await User.create({
    businessName: "Admin",
    email:        "admin@test.com",
    password:     await bcrypt.hash("Admin123!", 10),
    role:         "admin",
  });
  const res = await request(app).post("/api/auth/login").send({
    email: "admin@test.com", password: "Admin123!",
  });
  return res.body.token;
}

async function loginAsUser() {
  await request(app).post("/api/auth/register").send({
    businessName: "Normal", email: "normal@test.com", password: "Password123!",
  });
  const res = await request(app).post("/api/auth/login").send({
    email: "normal@test.com", password: "Password123!",
  });
  return res.body.token;
}

describe("Rutas admin — control de acceso", () => {
  it("rechaza GET /api/admin/stats sin token", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.statusCode).toBe(401);
  });

  it("rechaza GET /api/admin/stats con usuario normal con 403", async () => {
    const token = await loginAsUser();
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  it("permite GET /api/admin/stats con rol admin", async () => {
    const token = await loginAsAdmin();
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  it("rechaza POST /api/admin/products sin token", async () => {
    const res = await request(app).post("/api/admin/products").send({
      name: "Nuevo", price: 5000, category: "Frutal",
    });
    expect(res.statusCode).toBe(401);
  });
});
