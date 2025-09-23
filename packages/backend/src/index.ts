import { connectNodeAdapter } from "@connectrpc/connect-node";
import { createRouter } from "./router.js";
import { chromium, Browser } from "playwright";
import http from "http";

let browser: Browser | null = null;

async function main() {
  // Launch Playwright (headed so you can see the browser window for debugging)
  browser = await chromium.launch({ headless: true });
  console.log("[backend] Browser launched (headed)");

  // Create ConnectRPC adapter
  const handler = connectNodeAdapter({
    routes: createRouter(browser),
  });

  // Native HTTP server with CORS
  const server = http.createServer((req, res) => {
    // --- CORS headers ---
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, connect-protocol-version, connect-content-type"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    handler(req, res);
  });

  const port = 4000;
  server.listen(port, () => {
    console.log(`[backend] ConnectRPC server running at http://localhost:${port}`);
  });

  const shutdown = async () => {
    console.log("[backend] Shutting down...");
    server.close();
    if (browser) {
      await browser.close();
      console.log("[backend] Browser closed.");
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("[backend] Fatal error:", e);
  process.exit(1);
});
