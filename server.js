import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
import chatRouter from "./routes/chat.js";
import visionRouter from "./routes/vision.js";
import imagineRouter from "./routes/imagine.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Health check
app.get("/", (req, res) => res.json({ status: "Cymor AI Backend 🚀", version: "1.0.0" }));

app.use("/api/chat", chatRouter);
app.use("/api/vision", visionRouter);
app.use("/api/imagine", imagineRouter);

app.listen(PORT, () => console.log(`🚀 Cymor AI Backend running on port ${PORT}`));
