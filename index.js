/**
 * Hostinger Entry Point Proxy
 */
console.log('--- ROOT INDEX.JS STARTING ---');

async function bootstrap() {
  try {
    console.log('Importing bundled server from ./dist/server.js...');
    await import('./dist/server.js');
    console.log('Bundled server imported successfully.');
  } catch (error) {
    console.error('--- BOOTSTRAP ERROR ---');
    console.error('Failed to import ./dist/server.js');
    console.error(error);
    
    // Fallback simple server to prevent 503 and show error
    const express = (await import('express')).default;
    const app = express();
    const port = process.env.PORT || 3000;
    app.get('*', (req, res) => {
      res.status(500).send(`
        <h1>Server Startup Error</h1>
        <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      `);
    });
    app.listen(port, () => {
      console.log(`Fallback error server listening on port ${port}`);
    });
  }
}

bootstrap();
