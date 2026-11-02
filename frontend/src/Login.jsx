import { useState } from "react";
import { api, setToken } from "./api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { token } = await api(`/${mode}`, {
        method: "POST",
        body: { email, password },
      });
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 320, margin: "4rem auto" }}>
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{mode === "login" ? "Log in" : "Register"}</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p>
        {mode === "login" ? "No account? " : "Already registered? "}
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Register" : "Log in"}
        </button>
      </p>
    </div>
  );
}