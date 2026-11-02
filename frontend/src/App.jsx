import { useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { getToken, clearToken } from "./api";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));

  function logout() {
    clearToken();
    setLoggedIn(false);
  }

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  return <Dashboard onLogout={logout} />;
}

