const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { signToken, requireAuth } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Auth ----------
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(email.toLowerCase(), hash);
    const token = signToken({ id: result.lastInsertRowid });
    res.status(201).json({ token });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Email already registered" });
    }
    throw err;
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email || "").toLowerCase());

  if (!user || !bcrypt.compareSync(String(password || ""), user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ token: signToken(user) });
});

// Everything below this line requires a valid token
app.use("/api", requireAuth);

//---------------ValidateTransaction--------------

function validateTransaction({ type, amount, category, date }) {
  if (!["income", "expense"].includes(type)) return "type must be income or expense";
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return "amount must be a positive number";
  }
  if (typeof category !== "string" || !category.trim()) return "category is required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return "date must look like 2026-11-02";
  return null;
}

// ---------- Transactions ----------
app.get("/api/transactions", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC")
    .all(req.userId);
  res.json(rows);
});

app.post("/api/transactions", (req, res) => {
  const { type, amount, category, date, note } = req.body;
  const problem = validateTransaction(req.body);
  if (problem) return res.status(400).json({ error: problem });
  const result = db
    .prepare(
      "INSERT INTO transactions (user_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(req.userId, type, amount, category, date, note || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/transactions/:id", (req, res) => {
  const { type, amount, category, date, note } = req.body;
  const result = db
    .prepare(
      "UPDATE transactions SET type=?, amount=?, category=?, date=?, note=? WHERE id=? AND user_id=?"
    )
    .run(type, amount, category, date, note || null, req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ updated: true });
});

app.delete("/api/transactions/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM transactions WHERE id=? AND user_id=?")
    .run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

// ---------- Budgets ----------
app.get("/api/budgets", (req, res) => {
  res.json(
    db.prepare("SELECT category, monthly_limit FROM budgets WHERE user_id = ?").all(req.userId)
  );
});

app.put("/api/budgets/:category", (req, res) => {
  const { monthly_limit } = req.body;
  if (typeof monthly_limit !== "number" || monthly_limit < 0) {
    return res.status(400).json({ error: "monthly_limit must be a positive number" });
  }
  db.prepare(
    `INSERT INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)
     ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit`
  ).run(req.userId, req.params.category, monthly_limit);
  res.json({ category: req.params.category, monthly_limit });
});

// ---------- Summary ----------
app.get("/api/summary", (req, res) => {
  const month = req.query.month;
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    return res.status(400).json({ error: "month must look like 2026-11" });
  }

  const totals = db
    .prepare(
      "SELECT type, SUM(amount) AS total FROM transactions WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY type"
    )
    .all(req.userId, month);

  const byCategory = db
    .prepare(
      "SELECT category, SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC"
    )
    .all(req.userId, month);

  const income = totals.find((t) => t.type === "income")?.total || 0;
  const expenses = totals.find((t) => t.type === "expense")?.total || 0;

  const budgets = db
    .prepare("SELECT category, monthly_limit FROM budgets WHERE user_id = ?")
    .all(req.userId);
  const limits = Object.fromEntries(budgets.map((b) => [b.category, b.monthly_limit]));
  const categories = byCategory.map((c) => ({
    ...c,
    budget: limits[c.category] ?? null,
    over: limits[c.category] != null && c.total > limits[c.category],
  }));

  res.json({ month, income, expenses, balance: income - expenses, byCategory: categories });
});

if (require.main === module) {
  app.listen(3001, () => console.log("API running on http://localhost:3001"));
}

module.exports = app;