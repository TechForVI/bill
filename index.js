const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const app = express();
const port = process.env.PORT || 3000;

// اینٹی بوٹ ڈیٹیکشن کے لیے اسٹیلتھ پلگ ان کا استعمال
puppeteer.use(StealthPlugin());

app.get('/api/sniffer', async (req, res) => {
    const { targetUrl } = req.query;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "URL is required. Example: /api/sniffer?targetUrl=https://example.com" });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            // یہ لائن انوائرمنٹ ویری ایبل سے خود بخود پاتھ اٹھا لے گی
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable', 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();
        const interceptedUrls = new Set();

        // نیٹ ورک ریکوسٹس کو مانیٹر کرنا
        await page.setRequestInterception(true);
        page.on('request', request => {
            const url = request.url();
            // صرف اہم اینڈ پوائنٹس کو فلٹر کرنا
            if (url.includes('api') || url.includes('json') || url.includes('token') || url.includes('fetch')) {
                interceptedUrls.add(url);
            }
            request.continue();
        });

        // ویب سائٹ پر جانا
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        res.json({
            success: true,
            target: targetUrl,
            found_endpoints: [...interceptedUrls]
        });

    } catch (error) {
        console.error("Browser Error:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Browser Error: " + error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});