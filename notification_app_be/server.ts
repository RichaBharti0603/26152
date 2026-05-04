import express from "express";
import { loggingMiddleware, Log } from "../logging_middleware/index.js";

const app = express();
app.use(express.json());

// 1. Add the logging middleware globally to capture entire lifecycle
app.use(loggingMiddleware);

// 2. Example Route with logs
app.get("/users", (req, res) => {
  // Use Logger in Route
  Log("backend", "info", "route", "GET /users called");
  
  res.json({ message: "Success", users: [] });
});

// 3. Example Error Case
app.post("/users", (req, res) => {
  const { name } = req.body;
  if (!name) {
    // Use Logger in Error case
    Log("backend", "error", "handler", "invalid input received");
    return res.status(400).json({ error: "Name is required" });
  }

  res.status(201).json({ message: "User created" });
});

// 4. Example DB / service simulation
const simulateDbConnection = async () => {
  try {
    throw new Error("Connection Timeout");
  } catch (err) {
    // Use Logger in DB / service simulation
    Log("backend", "fatal", "db", "database connection failed");
  }
};

app.listen(3000, async () => {
  console.log("Server running on port 3000");
  await simulateDbConnection();
});
