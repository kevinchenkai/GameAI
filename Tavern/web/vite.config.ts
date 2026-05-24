import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const repoRoot = path.resolve(__dirname, "..");
const imagesRoot = path.join(repoRoot, "images");

function imageMiddleware(): Plugin {
  return {
    name: "wulin-tavern-images",
    configureServer(server) {
      server.middlewares.use("/images", (req, res) => {
        const rawUrl = decodeURIComponent((req.url || "/").split("?")[0]);
        const safePath = path.normalize(rawUrl).replace(/^(\.\.[/\\])+/, "");
        const filePath = path.join(imagesRoot, safePath);
        if (!filePath.startsWith(imagesRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".mp3": "audio/mpeg"
        };
        res.setHeader("Content-Type", types[ext] || "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/images", (req, res) => {
        const rawUrl = decodeURIComponent((req.url || "/").split("?")[0]);
        const safePath = path.normalize(rawUrl).replace(/^(\.\.[/\\])+/, "");
        const filePath = path.join(imagesRoot, safePath);
        if (!filePath.startsWith(imagesRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        fs.createReadStream(filePath).pipe(res);
      });
    }
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === "production" ? "/tavern/" : "/"),
  plugins: [imageMiddleware()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3002"
    }
  }
});
