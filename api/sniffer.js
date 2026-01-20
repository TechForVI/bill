const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  const { targetUrl } = req.query;
  if (!targetUrl) return res.status(400).send("URL missing");

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const interceptedRequests = [];

    // نیٹ ورک ٹریفک کو سننا شروع کریں
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api') || url.includes('download') || url.includes('convert')) {
        interceptedRequests.push(url);
      }
      request.continue();
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    res.json({
      success: true,
      found_endpoints: [...new Set(interceptedRequests)]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser !== null) await browser.close();
  }
};