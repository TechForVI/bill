const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const app = express();
const port = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());

app.get('/api/sniffer', async (req, res) => {
    const { targetUrl } = req.query;
    if (!targetUrl) return res.status(400).json({ error: "URL is required" });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            // ریلوے پر کرومیم کا راستہ
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        const interceptedUrls = new Set();

        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.includes('api') || url.includes('json') || url.includes('token')) {
                interceptedUrls.add(url);
            }
            request.continue();
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        res.json({ success: true, found_endpoints: [...interceptedUrls] });

    } catch (error) {
        res.status(500).json({ success: false, error: "Browser Error: " + error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// 0.0.0.0 ریلوے کے لیے بہت ضروری ہے
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});