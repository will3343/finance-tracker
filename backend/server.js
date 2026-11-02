const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/transactions", (req, res) => {
  const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
  res.json(rows);
});

app.post("/api/transactions", (req, res) => {
  const { type, amount, category, date, note } = req.body;
  if (!type || !amount || !category || !date) {
    return res.status(400).json({ error: "type, amount, category and date are required" });
  }
  const result = db
    .prepare("INSERT INTO transactions (type, amount, category, date, note) VALUES (?, ?, ?, ?, ?)")
    .run(type, amount, category, date, note || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/transactions/:id", (req, res) => {
  const { type, amount, category, date, note } = req.body;
  const result = db
    .prepare("UPDATE transactions SET type=?, amount=?, category=?, date=?, note=? WHERE id=?")
    .run(type, amount, category, date, note || null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ updated: true });
});

app.delete("/api/transactions/:id", (req, res) => {
  const result = db.prepare("DELETE FROM transactions WHERE id=?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

app.get("/api/summary", (req, res) => {
  const month = req.query.month; // e.g. 2026-11
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    return res.status(400).json({ error: "month must look like 2026-11" });
  }

  const totals = db
    .prepare("SELECT type, SUM(amount) AS total FROM transactions WHERE substr(date, 1, 7) = ? GROUP BY type")
    .all(month);

  const byCategory = db
    .prepare(
      "SELECT category, SUM(amount) AS total FROM transactions WHERE type = 'expense' AND substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC"
    )
    .all(month);

  const income = totals.find((t) => t.type === "income")?.total || 0;
  const expenses = totals.find((t) => t.type === "expense")?.total || 0;
  
  const budgets = db.prepare("SELECT category, monthly_limit FROM budgets").all();
  const limits = Object.fromEntries(budgets.map((b) => [b.category, b.monthly_limit]));
  const categories = byCategory.map((c) => ({
    ...c,
    budget: limits[c.category] ?? null,
    over: limits[c.category] != null && c.total > limits[c.category],
  }));

  res.json({ month, income, expenses, balance: income - expenses, byCategory: categories });
});

app.get("/api/budgets", (req, res) => {
  res.json(db.prepare("SELECT category, monthly_limit FROM budgets").all());
});

app.put("/api/budgets/:category", (req, res) => {
  const { monthly_limit } = req.body;
  if (typeof monthly_limit !== "number" || monthly_limit < 0) {
    return res.status(400).json({ error: "monthly_limit must be a positive number" });
  }
  db.prepare(
    `INSERT INTO budgets (category, monthly_limit) VALUES (?, ?)
     ON CONFLICT(category) DO UPDATE SET monthly_limit = excluded.monthly_limit`
  ).run(req.params.category, monthly_limit);
  res.json({ category: req.params.category, monthly_limit });
});

app.listen(3001, () => console.log("API running on http://localhost:3001"));