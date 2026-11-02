import { api } from "./api";

const money = (n) => Number(n).toFixed(2);

export default function Summary({ summary, onBudgetChanged, onError }) {
  async function setBudget(category, current) {
    const input = window.prompt(`Monthly budget for ${category}:`, current ?? "");
    if (input === null) return;
    const value = Number(input);
    if (Number.isNaN(value) || value < 0) return onError("Budget must be a positive number");
    try {
      await api(`/budgets/${encodeURIComponent(category)}`, {
        method: "PUT",
        body: { monthly_limit: value },
      });
      onBudgetChanged();
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <section>
      <div style={{ display: "flex", gap: 24 }}>
        <div>Income: <strong>{money(summary.income)}</strong></div>
        <div>Spending: <strong>{money(summary.expenses)}</strong></div>
        <div>Balance: <strong>{money(summary.balance)}</strong></div>
      </div>

      <h3>Spending by category</h3>
      {summary.byCategory.length === 0 && <p>No expenses this month.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {summary.byCategory.map((c) => (
          <li key={c.category} style={{ color: c.over ? "crimson" : "inherit" }}>
            {c.category}: {money(c.total)}
            {c.budget != null && ` / ${money(c.budget)}`}
            {c.over && " (over budget!)"}{" "}
            <button onClick={() => setBudget(c.category, c.budget)}>
              {c.budget == null ? "Set budget" : "Edit budget"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}