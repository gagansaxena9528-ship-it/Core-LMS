/**
 * Hostinger Entry Point Proxy (Ultra-Robust)
 */
import http from 'http';
console.log('--- ROOT INDEX.JS STARTING ---');

async function bootstrap() {
  const port = process.env.PORT || 3000;
  
  try {
    console.log('Importing bundled server from ./dist/server.js...');
    await import('./dist/server.js');
    console.log('Bundled server imported successfully.');
  } catch (error) {
    console.error('--- BOOTSTRAP ERROR ---');
    console.error(error);
    
    // Fallback server using BUILT-IN http module (no dependencies needed)
    const server = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #e11d48;">Server Startup Error</h1>
          <p>The application failed to start. Here is the technical detail:</p>
          <pre style="background: #f4f4f5; padding: 15px; border-radius: 8px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
          <p><strong>Possible fix:</strong> Check if all dependencies are installed and the build was successful.</p>
        </div>
      `);
    });
    
    server.listen(port, () => {
      console.log(`Fallback error server listening on port ${port}`);
    });
  }
}

bootstrap();
