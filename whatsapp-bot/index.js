require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const REPLY_MESSAGE = process.env.REPLY_MESSAGE || "Hi! I'm currently unavailable. I'll get back to you soon.";
const IGNORE_GROUPS = process.env.IGNORE_GROUPS !== 'false';
const IGNORE_SELF = process.env.IGNORE_SELF !== 'false';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

client.on('qr', (qr) => {
    console.log('\nScan this QR code with WhatsApp on your phone:\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('Authenticated successfully. Session saved.');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    process.exit(1);
});

client.on('ready', () => {
    console.log(`\nWhatsApp auto-reply bot is running.`);
    console.log(`Reply message: "${REPLY_MESSAGE}"`);
    console.log(`Ignore groups: ${IGNORE_GROUPS}`);
});

client.on('message', async (message) => {
    // Skip messages sent by yourself
    if (IGNORE_SELF && message.fromMe) return;

    // Skip group messages if configured
    if (IGNORE_GROUPS && message.from.endsWith('@g.us')) return;

    // Skip status broadcasts
    if (message.from === 'status@broadcast') return;

    try {
        await message.reply(REPLY_MESSAGE);
        console.log(`[${new Date().toLocaleTimeString()}] Auto-replied to ${message.from}`);
    } catch (err) {
        console.error('Failed to send reply:', err.message);
    }
});

client.on('disconnected', (reason) => {
    console.warn('Client disconnected:', reason);
    process.exit(0);
});

client.initialize();
