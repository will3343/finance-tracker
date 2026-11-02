import { useState } from "react";
import { api } from "./api";

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ editing, onSaved, onCancel }) {
  const [type, setType] = useState(editing?.type ?? "expense");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [date, setDate] = useState(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const body = { type, amount: Number(amount), category: category.trim(), date, note };
    try {
      if (editing) {
        await api(`/transactions/${editing.id}`, { method: "PUT", body });
      } else {
        await api("/transactions", { method: "POST", body });
        setAmount("");
        setCategory("");
        setNote("");
      }
      onSaved();
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
      <button type="submit">{editing ? "Save" : "Add"}</button>
      {editing && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </form>
  );
}