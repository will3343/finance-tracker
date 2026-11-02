import { useEffect, useState } from "react";
import { api } from "./api";
import Summary from "./Summary";
import TransactionForm from "./TransactionForm";

export default function Dashboard({ onLogout }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const reload = () => setRefresh((n) => n + 1);

  useEffect(() => {
    async function load() {
      try {
        const [txs, sum] = await Promise.all([
          api("/transactions"),
          api(`/summary?month=${month}`),
        ]);
        setTransactions(txs);
        setSummary(sum);
        setError("");
      } catch (err) {
        if (err.status === 401) onLogout();
        else setError(err.message);
      }
    }
    load();
  }, [month, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const visible = transactions.filter((t) => t.date.startsWith(month));

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Finance Tracker</h1>
        <button onClick={onLogout}>Log out</button>
      </header>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <label>
        Month:{" "}
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </label>

      {summary && <Summary summary={summary} onBudgetChanged={reload} onError={setError} />}

      <h3>Add transaction</h3>
      <TransactionForm onAdded={reload} />

      <h3>Transactions</h3>
      {visible.length === 0 && <p>No transactions this month.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {visible.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 12, padding: "4px 0" }}>
            <span>{t.date}</span>
            <span style={{ flex: 1 }}>
              {t.category}
              {t.note && ` · ${t.note}`}
            </span>
            <span style={{ color: t.type === "income" ? "green" : "inherit" }}>
              {t.type === "income" ? "+" : "-"}
              {t.amount.toFixed(2)}
            </span>
            <button onClick={() => remove(t.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}