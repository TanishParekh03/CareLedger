require('dotenv').config();

const app = require('./src/app');
const ocrManager = require('./src/utils/ocrManager');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Initialize OCR manager and start server
async function startServer() {
    try {
        console.log('[SERVER] Initializing OCR service...');
        await ocrManager.initialize();
        console.log('[SERVER] ✅ OCR service initialized and ready!');

        app.listen(PORT, () => {
            console.log(`[SERVER] 🚀 Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('[SERVER] ❌ Failed to initialize OCR service:', err.message);
        console.error('[SERVER] Server startup aborted.');
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('[SERVER] Shutting down gracefully...');
    await ocrManager.shutdown();
    process.exit(0);
});
