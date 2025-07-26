import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
console.log('Starting WhatsApp Bot...');

const api = axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': process.env.INTERNAL_API_KEY }
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            // '--single-process', // This flag is removed for better Docker compatibility
            '--disable-gpu'
        ],
    }
});

client.on('qr', qr => {
    console.log('QR code received, please scan with your phone.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

client.on('message', async (message) => {
    const userMessage = message.body.toLowerCase().trim();
    const userPhone = message.from.split('@')[0].slice(2); 
    console.log(`Received command '${userMessage}' from phone number: ${userPhone}`);

    switch (userMessage) {
        case 'help':
            message.reply('Welcome to Apna Mandi Support!\n\nType *order* to see your last order status.\nType *contact* to get support details.');
            break;
        case 'order':
            try {
                const { data } = await api.get(`/orders/by-phone/${userPhone}`);
                const { orderId, totalPrice, status, items } = data;
                const itemLines = items.map(item => `- ${item.name} (${item.quantity})`).join('\n');
                const replyMessage = `Hi! Here's your latest order status:\n\n*Order ID:* #${orderId}\n*Status:* ${status}\n*Total:* ₹${totalPrice}\n\n*Items:*\n${itemLines}`;
                message.reply(replyMessage);
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    message.reply('Sorry, we could not find any recent orders for your number.');
                } else {
                    message.reply('Sorry, something went wrong while fetching your order. Please try again later.');
                    console.error("API Error fetching order:", error.message);
                }
            }
            break;
        case 'contact':
            message.reply('For immediate help, please call our support line at 0141-XXXXXXX.');
            break;
    }
});

client.initialize();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

app.post('/send-order-confirmation', async (req, res) => {
    const { phone, orderId, total, items } = req.body;
    if (!phone || !orderId || !total || !items) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    const chatId = `91${phone}@c.us`;
    const itemLines = items.map(item => `- ${item.name}: ${item.quantity}`).join('\n');
    const confirmationMessage = `✅ *Order Confirmed!* ✅\n\nHello! Your Apna Mandi order #${orderId} has been placed successfully.\n\n*Items:*\n${itemLines}\n\n*Total Amount:* ₹${total}\n\nYour order will be delivered to your cluster's drop-off point tomorrow morning. Thank you!`;

    try {
        await client.sendMessage(chatId, confirmationMessage);
        console.log(`Sent order confirmation to ${phone}`);
        res.status(200).json({ success: true, message: 'Confirmation sent successfully.' });
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.' });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Bot API server listening on port ${PORT}`);
});
