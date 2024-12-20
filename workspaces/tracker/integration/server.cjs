var http = require("http");
var fs = require("fs");
var path = require("path");

var tracker = fs.readFileSync(path.join(__dirname, "../dist/tracker.js"));
var index = fs.readFileSync(path.join(__dirname, "./index.html"));

http.createServer(function (req, res) {
    // get the url
    if (req.url === "/tracker.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(tracker);
    } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(index);
    }
}).listen(3004);
