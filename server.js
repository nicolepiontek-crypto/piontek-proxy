const express = require('express');
const https = require('https');

const app = express();

// Manual CORS - allow everything
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok', service: 'Piontek Image Proxy' }));

function httpsPost(url, data, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const body = JSON.stringify(data);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch(e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

app.post('/generate-image', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    try {
        const result = await httpsPost(
            'https://api.openai.com/v1/images/generations',
            { model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' },
            { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        );

        if (result.status !== 200) {
            return res.status(result.status).json({ error: result.body.error?.message || 'OpenAI error' });
        }

        res.json({ url: result.body.data[0].url });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Piontek Proxy running on port ${PORT}`));
