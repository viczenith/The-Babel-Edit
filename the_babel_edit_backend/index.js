import app from './app.js';
import prisma from './prismaClient.js';
import { once } from 'events';

// Host and starting port
const START_PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  try {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Try to listen on START_PORT and fallback to next available ports
const tryListen = async (startPort, host, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const server = app.listen(port, host);

    try {
      await Promise.race([
        once(server, 'listening'),
        once(server, 'error').then((err) => { throw err[0]; })
      ]);

      // connected and listening — test DB then return
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
      } catch (dbErr) {
        console.error('❌ Failed to connect to database:', dbErr);
        server.close();
        process.exit(1);
      }

      console.log(`🚀 Server running on ${host}:${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check available at /api/health`);
      return server;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use — trying next port`);
        // ensure server is closed before retry
        try { server.close(); } catch {}
        continue;
      }
      console.error('❌ Server start error:', err);
      try { server.close(); } catch {}
      process.exit(1);
    }
  }

  console.error(`❌ Could not find an available port in range ${startPort}..${startPort + maxAttempts - 1}`);
  process.exit(1);
};

(async () => {
  await tryListen(START_PORT, HOST, 20);
})();