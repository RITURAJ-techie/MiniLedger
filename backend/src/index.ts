import "dotenv/config";
import app from "./app.js";
import { closeDatabase } from "./db/index.js";

const port = Number(process.env.PORT ?? 5000);

const server = app.listen(port, () => {
  console.log(`MiniLedger API running at http://localhost:${port}`);
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  server.close((error) => {
    if (error) {
      console.error("HTTP server shutdown failed:", error);
      process.exitCode = 1;
    }

    void closeDatabase().catch((dbError) => {
      console.error("Database shutdown failed:", dbError);
      process.exitCode = 1;
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));