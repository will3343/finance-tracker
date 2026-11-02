import { useState } from "react";
import Login from "./Login";
import { getToken, clearToken } from "./api";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));

  function logout() {
    clearToken();
    setLoggedIn(false);
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <h1>Finance Tracker</h1>
      <button onClick={logout}>Log out</button>
    </div>
  );
}