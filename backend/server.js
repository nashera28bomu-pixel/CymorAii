import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRouter from "./routes/chat.js";
import visionRouter from "./routes/vision.js";
import imagineRouter from "./routes/imagine.js";
import searchRouter from "./routes/search.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/", (_, res) => res.json({ status: "🚀 Cymor AI Backend", version: "2.0.0" }));
app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/chat", chatRouter);
app.use("/api/vision", visionRouter);
app.use("/api/imagine", imagineRouter);
app.use("/api/search", searchRouter);

app.listen(PORT, () => console.log(`🚀 Cymor AI running on port ${PORT}`));
