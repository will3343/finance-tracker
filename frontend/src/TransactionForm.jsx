import { useState } from "react";
import { api } from "./api";

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ onAdded }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/transactions", {
        method: "POST",
        body: { type, amount: Number(amount), category: category.trim(), date, note },
      });
      setAmount("");
      setCategory("");
      setNote("");
      onAdded();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
      />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit">Add</button>
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </form>
  );
}