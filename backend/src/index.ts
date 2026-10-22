
import app from "./app.js";
import { env } from "./common/config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`MiniLedger API running on port ${env.PORT}`);
  console.log(`Health: http://localhost:${env.PORT}/api/health`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down server...`);

  server.close((error) => {
    if (error) {
      console.error("Server shutdown failed:", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
