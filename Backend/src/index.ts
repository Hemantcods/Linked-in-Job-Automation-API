import app from "./app";
import { connectDB } from "./db/index";
import { env } from "./config/env";

const PORT = env.PORT;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});