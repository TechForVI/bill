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
            // یہاں ہم نے یقینی بنایا ہے کہ یہ آپ کے ریلوے والے ویری ایبل کو استعمال کرے
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        const interceptedUrls = new Set();

        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            // ان فلٹرز کی مدد سے ہم صرف کام کے لنکس نکالتے ہیں
            if (url.includes('api') || url.includes('json') || url.includes('v1') || url.includes('v2') || url.includes('token')) {
                interceptedUrls.add(url);
            }
            request.continue();
        });

        // یہاں ہم ویب سائٹ کو لوڈ ہونے کا وقت دیتے ہیں
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        res.json({
            success: true,
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