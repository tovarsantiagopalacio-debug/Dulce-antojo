require("./setup");
const request = require("supertest");
const app     = require("../app");

describe("POST /api/auth/register", () => {
  it("registra un usuario nuevo y devuelve 201", async () => {
    const res = await request(app).post("/api/auth/register").send({
      businessName: "Tienda Test",
      email:        "santiago@test.com",
      password:     "Password123!",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("message");
  });

  it("rechaza email duplicado con 409", async () => {
    const payload = { businessName: "Dup", email: "dup@test.com", password: "Password123!" };
    await request(app).post("/api/auth/register").send(payload);
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.statusCode).toBe(409);
  });

  it("rechaza password corta (< 8 chars) con 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      businessName: "Short", email: "short@test.com", password: "abc",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      businessName: "Login User", email: "login@test.com", password: "Password123!",
    });
  });

  it("devuelve token con credenciales correctas", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@test.com", password: "Password123!",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("rechaza password incorrecta con 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@test.com", password: "WrongPass!",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rechaza email inexistente con 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "noexiste@test.com", password: "Password123!",
    });
    expect(res.statusCode).toBe(401);
  });
});
