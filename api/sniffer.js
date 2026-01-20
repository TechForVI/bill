const axios = require('axios');

module.exports = async (req, res) => {
  // CORS ہینڈلنگ (تاکہ کسی بھی جگہ سے کال ہو سکے)
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    // ویب سائٹ لوڈ کرنے کی کوشش
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 15000 // 15 سیکنڈ کا ٹائم آؤٹ
    });

    const html = response.data;
    const links = new Set();

    // 1. تمام مکمل لنکس ڈھونڈیں (Regex)
    const fullUrlRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-z]{2,6}(?:\/[^\s"'`<>]+)?/g;
    const matches = html.match(fullUrlRegex);
    
    if (matches) {
      matches.forEach(link => {
        // فالتو لنکس کو فلٹر کریں
        if (!link.includes('google') && !link.includes('facebook') && !link.includes('schema.org')) {
          links.add(link);
        }
      });
    }

    // 2. مخصوص API پیٹرن تلاش کریں (مثلاً /api/v1/...)
    const apiPattern = /["'](\/[^"']*api[^"']*)["']/g;
    let apiMatch;
    while ((apiMatch = apiPattern.exec(html)) !== null) {
      links.add(apiMatch[1]);
    }

    res.status(200).json({
      success: true,
      found_endpoints: [...links].slice(0, 50)
    });

  } catch (error) {
    // 500 ایرر کے بجائے تفصیل بھیجیں
    res.status(200).json({
      success: false,
      error: "Could not scan website",
      details: error.message
    });
  }
};