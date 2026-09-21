import { startAppServer } from "./server/index";

startAppServer().catch((err) => {
  console.error("Failed to start server:", err);
});
