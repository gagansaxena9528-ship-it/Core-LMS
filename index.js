/**
 * Hostinger Entry Point
 */
console.log('--- HOSTINGER: STARTING INDEX.JS ---');

try {
  console.log('--- HOSTINGER: IMPORTING SERVER... ---');
  await import('./dist/server.js');
  console.log('--- HOSTINGER: SERVER IMPORTED SUCCESSFULLY ---');
} catch (error) {
  console.error('--- HOSTINGER: CRITICAL ERROR DURING STARTUP ---');
  console.error(error);
  process.exit(1);
}
