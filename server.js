import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import locationsRouter from "./src/routes/locations.js";
import usersRouter from "./src/routes/users.js";
import reviewsRouter from "./src/routes/reviews.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => {
  res.json({ message: "hello from express!!!" });
});

app.use("/api/locations", locationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/reviews", reviewsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});