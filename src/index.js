import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import suppliersRouter from "./routes/suppliers.js";
import aiRouter from "./routes/ai.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "*",  
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// Routes
app.use("/api/suppliers", suppliersRouter);
app.use("/api/ai", aiRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "SealCargo Backend is running!",
    timestamp: new Date().toISOString(),
    grokEnabled: !!process.env.GROK_API_KEY && 
                 process.env.GROK_API_KEY !== "your_grok_api_key_here",
    rapidApiEnabled: !!process.env.RAPIDAPI_KEY && 
                     process.env.RAPIDAPI_KEY !== "your_rapidapi_key_here",
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ SealCargo Backend running at http://localhost:${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/health\n`);
});