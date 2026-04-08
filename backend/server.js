require('dotenv').config();

const app = require('./src/app');
// const ocrManager = require('./src/utils/ocrManager');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ENABLE_OCR = process.env.ENABLE_OCR === 'true'; // Set to 'true' in .env to enable OCR

// Initialize OCR manager and start server
async function startServer() {
    try {
        if (ENABLE_OCR) {
            console.log('[SERVER] Initializing OCR service...');
            const ocrManager = require('./src/utils/ocrManager');
            await ocrManager.initialize();
            console.log('[SERVER] ✅ OCR service initialized and ready!');
        } else {
            console.log('[SERVER] ⚠️  OCR service disabled (set ENABLE_OCR=true in .env to enable)');
        }

        app.listen(PORT, () => {
            console.log(`[SERVER] 🚀 Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error('[SERVER] ❌ Failed to initialize:', err.message);
        console.error('[SERVER] Server startup aborted.');
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('[SERVER] Shutting down gracefully...');
    if (ENABLE_OCR) {
        const ocrManager = require('./src/utils/ocrManager');
        await ocrManager.shutdown();
    }
    process.exit(0);
});
