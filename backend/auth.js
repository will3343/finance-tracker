const jwt = require("jsonwebtoken");

// In real deployments this must come from an environment variable.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET is not set. Add it to backend/.env");
}

function signToken(user) {
  return jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required" });

  try {
    req.userId = jwt.verify(token, SECRET).userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { signToken, requireAuth };