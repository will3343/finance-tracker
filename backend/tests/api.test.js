// Set these before the app loads: tests use an in-memory database.
process.env.JWT_SECRET = "test-secret";
process.env.DB_FILE = ":memory:";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

let counter = 0;

async function registerUser() {
  counter += 1;
  const res = await request(app)
    .post("/api/register")
    .send({ email: `user${counter}@example.com`, password: "password123" });
  assert.equal(res.status, 201);
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const sample = {
  type: "expense",
  amount: 20,
  category: "Food",
  date: "2026-11-02",
  note: "Lunch",
};

async function addTransaction(token, overrides = {}) {
  const res = await request(app)
    .post("/api/transactions")
    .set(auth(token))
    .send({ ...sample, ...overrides });
  assert.equal(res.status, 201);
  return res.body.id;
}

describe("authentication", () => {
  test("register returns a token", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ email: "new@example.com", password: "password123" });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
  });

  test("register rejects a short password", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ email: "short@example.com", password: "abc" });
    assert.equal(res.status, 400);
  });

  test("register rejects an invalid email", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ email: "not-an-email", password: "password123" });
    assert.equal(res.status, 400);
  });

  test("register rejects a duplicate email", async () => {
    const body = { email: "dupe@example.com", password: "password123" };
    await request(app).post("/api/register").send(body);
    const res = await request(app).post("/api/register").send(body);
    assert.equal(res.status, 409);
  });

  test("login works with the right password", async () => {
    const body = { email: "login@example.com", password: "password123" };
    await request(app).post("/api/register").send(body);
    const res = await request(app).post("/api/login").send(body);
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  test("login fails with the wrong password", async () => {
    await request(app)
      .post("/api/register")
      .send({ email: "wrong@example.com", password: "password123" });
    const res = await request(app)
      .post("/api/login")
      .send({ email: "wrong@example.com", password: "not-the-password" });
    assert.equal(res.status, 401);
  });

  test("protected routes reject requests without a token", async () => {
    const res = await request(app).get("/api/transactions");
    assert.equal(res.status, 401);
  });

  test("protected routes reject an invalid token", async () => {
    const res = await request(app)
      .get("/api/transactions")
      .set({ Authorization: "Bearer not-a-real-token" });
    assert.equal(res.status, 401);
  });
});

describe("transactions", () => {
  test("create then list", async () => {
    const token = await registerUser();
    const id = await addTransaction(token);

    const res = await request(app).get("/api/transactions").set(auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, id);
    assert.equal(res.body[0].category, "Food");
  });

  test("create rejects missing fields", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/transactions")
      .set(auth(token))
      .send({ type: "expense" });
    assert.equal(res.status, 400);
  });

  test("create rejects an invalid type", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/transactions")
      .set(auth(token))
      .send({ ...sample, type: "gift" });
    assert.equal(res.status, 400);
  });

  test("create rejects a negative amount", async () => {
    const token = await registerUser();
    const res = await request(app)
      .post("/api/transactions")
      .set(auth(token))
      .send({ ...sample, amount: -5 });
    assert.equal(res.status, 400);
  });

  test("update changes the record", async () => {
    const token = await registerUser();
    const id = await addTransaction(token);

    const res = await request(app)
      .put(`/api/transactions/${id}`)
      .set(auth(token))
      .send({ ...sample, amount: 35, category: "Groceries" });
    assert.equal(res.status, 200);

    const list = await request(app).get("/api/transactions").set(auth(token));
    assert.equal(list.body[0].amount, 35);
    assert.equal(list.body[0].category, "Groceries");
  });

  test("delete removes the record", async () => {
    const token = await registerUser();
    const id = await addTransaction(token);

    const res = await request(app)
      .delete(`/api/transactions/${id}`)
      .set(auth(token));
    assert.equal(res.status, 200);

    const list = await request(app).get("/api/transactions").set(auth(token));
    assert.equal(list.body.length, 0);
  });

  test("deleting a record that does not exist returns 404", async () => {
    const token = await registerUser();
    const res = await request(app)
      .delete("/api/transactions/999999")
      .set(auth(token));
    assert.equal(res.status, 404);
  });


    test("update rejects an invalid type", async () => {
    const token = await registerUser();
    const id = await addTransaction(token);
    const res = await request(app)
      .put(`/api/transactions/${id}`)
      .set(auth(token))
      .send({ ...sample, type: "gift" });
    assert.equal(res.status, 400);
  });

  test("update rejects a negative amount", async () => {
    const token = await registerUser();
    const id = await addTransaction(token);
    const res = await request(app)
      .put(`/api/transactions/${id}`)
      .set(auth(token))
      .send({ ...sample, amount: -5 });
    assert.equal(res.status, 400);
  });

});

describe("data isolation between users", () => {
  test("a user cannot see another user's transactions", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    await addTransaction(alice);

    const res = await request(app).get("/api/transactions").set(auth(bob));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  test("a user cannot edit another user's transaction", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const id = await addTransaction(alice);

    const res = await request(app)
      .put(`/api/transactions/${id}`)
      .set(auth(bob))
      .send({ ...sample, amount: 9999 });
    assert.equal(res.status, 404);

    const list = await request(app).get("/api/transactions").set(auth(alice));
    assert.equal(list.body[0].amount, 20);
  });

  test("a user cannot delete another user's transaction", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const id = await addTransaction(alice);

    const res = await request(app)
      .delete(`/api/transactions/${id}`)
      .set(auth(bob));
    assert.equal(res.status, 404);

    const list = await request(app).get("/api/transactions").set(auth(alice));
    assert.equal(list.body.length, 1);
  });

  test("budgets are private to each user", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    await request(app)
      .put("/api/budgets/Food")
      .set(auth(alice))
      .send({ monthly_limit: 100 });

    const res = await request(app).get("/api/budgets").set(auth(bob));
    assert.deepEqual(res.body, []);
  });

  test("summaries only include the user's own data", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    await addTransaction(alice, { amount: 500 });

    const res = await request(app)
      .get("/api/summary?month=2026-11")
      .set(auth(bob));
    assert.equal(res.body.expenses, 0);
    assert.deepEqual(res.body.byCategory, []);
  });
});

describe("summary and budgets", () => {
  test("totals, categories and month filtering", async () => {
    const token = await registerUser();
    await addTransaction(token, { type: "income", amount: 3000, category: "Salary", date: "2026-11-01" });
    await addTransaction(token, { amount: 45.5, category: "Food", date: "2026-11-02" });
    await addTransaction(token, { amount: 12, category: "Transport", date: "2026-11-03" });
    await addTransaction(token, { amount: 100, category: "Food", date: "2026-10-15" }); // other month

    const res = await request(app)
      .get("/api/summary?month=2026-11")
      .set(auth(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.income, 3000);
    assert.equal(res.body.expenses, 57.5);
    assert.equal(res.body.balance, 2942.5);
    assert.equal(res.body.byCategory[0].category, "Food");
    assert.equal(res.body.byCategory[0].total, 45.5);
  });

  test("rejects a malformed month", async () => {
    const token = await registerUser();
    const res = await request(app)
      .get("/api/summary?month=november")
      .set(auth(token));
    assert.equal(res.status, 400);
  });

  test("a budget marks a category as over when spending exceeds it", async () => {
    const token = await registerUser();
    await addTransaction(token, { amount: 45.5, category: "Food" });
    await addTransaction(token, { amount: 12, category: "Transport" });

    const put = await request(app)
      .put("/api/budgets/Food")
      .set(auth(token))
      .send({ monthly_limit: 40 });
    assert.equal(put.status, 200);

    const res = await request(app)
      .get("/api/summary?month=2026-11")
      .set(auth(token));
    const food = res.body.byCategory.find((c) => c.category === "Food");
    const transport = res.body.byCategory.find((c) => c.category === "Transport");
    assert.equal(food.budget, 40);
    assert.equal(food.over, true);
    assert.equal(transport.budget, null);
    assert.equal(transport.over, false);
  });

  test("updating a budget replaces the old limit", async () => {
    const token = await registerUser();
    await request(app).put("/api/budgets/Food").set(auth(token)).send({ monthly_limit: 40 });
    await request(app).put("/api/budgets/Food").set(auth(token)).send({ monthly_limit: 80 });

    const res = await request(app).get("/api/budgets").set(auth(token));
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].monthly_limit, 80);
  });

  test("rejects a negative budget", async () => {
    const token = await registerUser();
    const res = await request(app)
      .put("/api/budgets/Food")
      .set(auth(token))
      .send({ monthly_limit: -10 });
    assert.equal(res.status, 400);
  });
});