const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    try {
        let content = fs.readFileSync(path.join(__dirname, filePath));
        let ext = path.extname(filePath).slice(1);
        let mime = { 'html': 'text/html', 'js': 'text/javascript', 'css': 'text/css', 'jpeg': 'image/jpeg', 'jpg': 'image/jpeg', 'png': 'image/png', 'svg': 'image/svg+xml' };
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(content);
    } catch (e) {
        res.writeHead(404);
        res.end('Not found');
    }
}).listen(8000, () => console.log('Server jalan di http://localhost:8000'));
