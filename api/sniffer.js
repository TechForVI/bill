const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const { targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: "URL missing" });

  let browser = null;
  try {
    // Puppeteer چلانے کی کوشش
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    const interceptedRequests = new Set();

    // نیٹ ورک ٹریفک کو مانیٹر کرنا
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api') || url.includes('download') || url.includes('convert') || url.includes('.js')) {
        interceptedRequests.add(url);
      }
      request.continue();
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 25000 });

    res.json({
      success: true,
      mode: "Puppeteer (Network Intercept)",
      found_endpoints: [...interceptedRequests].slice(0, 40)
    });

  } catch (error) {
    console.error("Puppeteer Error, falling back to Static Scan:", error.message);
    
    // Fallback: اگر براؤزر نہ چلے تو سادہ اسکین کریں
    try {
      const response = await axios.get(targetUrl, { timeout: 8000 });
      const $ = cheerio.load(response.data);
      const staticLinks = [];
      $('script, a').each((i, el) => {
        const link = $(el).attr('src') || $(el).attr('href');
        if (link && link.startsWith('http')) staticLinks.push(link);
      });

      res.json({
        success: true,
        mode: "Static Fallback (Browser Failed)",
        found_endpoints: staticLinks.slice(0, 30),
        log: error.message
      });
    } catch (innerError) {
      res.status(500).json({ success: false, error: "Both methods failed" });
    }
  } finally {
    if (browser !== null) await browser.close();
  }
};