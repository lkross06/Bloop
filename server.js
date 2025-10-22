import express from "express";

const app = express();
const PORT = 3000;

app.get("/test", (req, res) => {
  res.json({ message: "hello from express!!!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});