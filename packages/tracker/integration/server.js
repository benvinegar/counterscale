import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load tracker script
const tracker = fs.readFileSync(
    path.join(__dirname, "../dist/loader/tracker.js"), // NOTE: needs to be built first
);

const PORT = 3004;

http.createServer(function (req, res) {
    console.log("Request for " + req.url + " received");
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    // Serve tracker.js
    if (requestUrl.pathname === "/tracker.js") {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(tracker);
        return;
    } else if (requestUrl.pathname === "/collect") {
        // no-op writes to /collect
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
    } else if (requestUrl.pathname.indexOf("..") !== -1) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("Not found");
    } else {
        const resolvedUrl = req.url.endsWith("/")
            ? req.url + "index.html"
            : req.url;
        const filePath = path.join(__dirname, resolvedUrl);
        let file;
        try {
            file = fs.readFileSync(filePath);
        } catch {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(file);
    }
}).listen(PORT);

console.log(`Server running at http://localhost:${PORT}/`);
