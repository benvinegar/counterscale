var http = require("http");
var fs = require("fs");
var path = require("path");

// Load reporter script
var reporter = fs.readFileSync(path.join(__dirname, "../dist/reporter.js"));

const PORT = 3004;

http.createServer(function (req, res) {
    console.log("Request for " + req.url + " received");
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    // Serve reporter.js
    if (requestUrl.pathname === "/reporter.js") {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(reporter);
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
        } catch (e) {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("Not found");
            return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(file);
    }
}).listen(PORT);

console.log(`Server running at http://localhost:${PORT}/`);
