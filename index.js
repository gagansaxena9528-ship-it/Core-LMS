/**
 * Hostinger Entry Point Proxy (Production Mode)
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
    
    // Fallback server to show the error in browser
    const server = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #e11d48;">Application Startup Error</h1>
          <p>The Node.js process is running, but the application failed to load.</p>
          <div style="text-align: left; background: #f4f4f5; padding: 20px; border-radius: 8px; overflow: auto; max-width: 800px; margin: 20px auto;">
            <pre style="margin: 0;">${error instanceof Error ? error.stack : String(error)}</pre>
          </div>
          <p>Please check your <b>better-sqlite3</b> installation or build logs.</p>
        </div>
      `);
    });
    
    server.listen(port, () => {
      console.log(`Fallback error server listening on port ${port}`);
    });
  }
}

bootstrap();
