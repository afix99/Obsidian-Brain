require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');

const PORT = process.env.PORT || 3000;
const REPLY_MESSAGE = process.env.REPLY_MESSAGE || "Hi! I'm currently unavailable. I'll get back to you soon.";
const IGNORE_GROUPS = process.env.IGNORE_GROUPS !== 'false';
const IGNORE_SELF = process.env.IGNORE_SELF !== 'false';

let qrDataUrl = null;
let status = 'waiting'; // waiting | ready | disconnected

// HTTP server so you can open the app URL to scan the QR code
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (status === 'ready') {
        res.end('<h2 style="font-family:sans-serif;color:green">✅ Bot is connected and running.</h2>');
    } else if (status === 'disconnected') {
        res.end('<h2 style="font-family:sans-serif;color:red">❌ Bot disconnected. Restart the service.</h2>');
    } else if (qrDataUrl) {
        res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center">
            <h2>Scan with WhatsApp to connect</h2>
            <p>WhatsApp → ⋮ Menu → Linked Devices → Link a Device</p>
            <img src="${qrDataUrl}" style="width:300px;height:300px" />
            <p><small>QR code refreshes automatically. Reload this page if it expires.</small></p>
        </body></html>`);
    } else {
        res.end('<h2 style="font-family:sans-serif">Generating QR code... Refresh in a few seconds.</h2>');
    }
});

server.listen(PORT, () => console.log(`Open the app URL in your browser to scan the QR code (port ${PORT})`));

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
});

client.on('qr', async (qr) => {
    qrDataUrl = await qrcode.toDataURL(qr);
    console.log('QR code ready — open the app URL in your browser to scan.');
});

client.on('authenticated', () => {
    qrDataUrl = null;
    console.log('Authenticated. Session saved.');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
    process.exit(1);
});

client.on('ready', () => {
    status = 'ready';
    console.log(`Bot is running. Reply: "${REPLY_MESSAGE}"`);
});

client.on('message', async (message) => {
    if (IGNORE_SELF && message.fromMe) return;
    if (IGNORE_GROUPS && message.from.endsWith('@g.us')) return;
    if (message.from === 'status@broadcast') return;

    try {
        await message.reply(REPLY_MESSAGE);
        console.log(`[${new Date().toLocaleTimeString()}] Replied to ${message.from}`);
    } catch (err) {
        console.error('Failed to send reply:', err.message);
    }
});

client.on('disconnected', (reason) => {
    status = 'disconnected';
    console.warn('Disconnected:', reason);
    process.exit(0);
});

client.initialize();
