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
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        const interceptedUrls = new Set();

        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            if (url.includes('api') || url.includes('json') || url.includes('v1') || url.includes('v2')) {
                interceptedUrls.add(url);
            }
            request.continue();
        });

        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        res.json({
            success: true,
            method: "Puppeteer Stealth Network Intercept",
            found_endpoints: [...interceptedUrls]
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});