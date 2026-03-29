/**
 * Hostinger Entry Point - TEST MODE
 */
import http from 'http';

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center;">
      <h1 style="color: #10b981;">Node.js is Working!</h1>
      <p>If you see this message, it means your Node.js process is running correctly on Hostinger.</p>
      <p>Current Port: <b>${port}</b></p>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
      <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Refresh Page</button>
    </div>
  `);
});

server.listen(port, () => {
  console.log(`Test server is running on port ${port}`);
});
