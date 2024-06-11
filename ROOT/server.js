const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

let balances = {};
let users = {}; // Store users in-memory for simplicity
let verificationCodes = {};

app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET_KEY = 'sk_live_c59ae74c2382fc5f3972b848cd8df0be8c14d3f7';

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password'
    }
});

// Endpoint to handle signup
app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    if (users[email]) {
        return res.json({ success: false, message: 'User already exists' });
    }

    const verificationCode = crypto.randomBytes(3).toString('hex');
    verificationCodes[email] = verificationCode;

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Verify your account',
        text: `Your verification code is: ${verificationCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.json({ success: false, message: 'Error sending verification email' });
        }

        users[email] = { password, verified: false };
        res.json({ success: true, message: 'Verification code sent to email' });
    });
});

// Endpoint to handle login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const user = users[email];
    if (!user) {
        return res.json({ success: false, message: 'User not found' });
    }

    if (!user.verified) {
        return res.json({ success: false, message: 'Please verify your account' });
    }

    if (user.password !== password) {
        return res.json({ success: false, message: 'Incorrect password' });
    }

    res.json({ success: true, message: 'Login successful' });
});

// Endpoint to verify account
app.post('/verify', (req, res) => {
    const { email, code } = req.body;

    if (verificationCodes[email] && verificationCodes[email] === code) {
        users[email].verified = true;
        return res.json({ success: true, message: 'Account verified' });
    }

    res.json({ success: false, message: 'Invalid verification code' });
});

// Endpoint to initialize transaction
app.post('/initialize-transaction', async (req, res) => {
    const { email, amount } = req.body;

    try {
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email,
            amount: amount * 100 // Convert to kobo
        }, {
            headers: {
                Authorization: `Bearer ${SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

// Endpoint to verify transaction
app.get('/verify-transaction/:reference', async (req, res) => {
    const reference = req.params.reference;

    try {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${SECRET_KEY}`
            }
        });

        const { data } = response.data;
        if (data.status === 'success') {
            // Update user's balance
            if (!balances[data.customer.email]) {
                balances[data.customer.email] = 0;
            }
            balances[data.customer.email] += data.amount / 100; // Convert from kobo to Naira
        }

        res.json(response.data);
    } catch (error) {
        res.status(500).send(error.response.data);
    }
});

// WebSocket server setup for real-time updates
const wss = new WebSocket.Server({ server: app.listen(PORT, () => console.log(`Server running on port ${PORT}`)) });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.email) {
            ws.send(JSON.stringify({ balance: balances[data.email] || 0 }));
        }
    });
});

app.get('/balance/:email', (req, res) => {
    const email = req.params.email;
    res.json({ balance: balances[email] || 0 });
});