const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: "URL required" });

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const html = response.data;
    const endpoints = new Set();

    // 1. HTML میں سے تمام لنکس نکالیں
    const linkRegex = /https?:\/\/[^\s"'`<>]+/g;
    (html.match(linkRegex) || []).forEach(l => endpoints.add(l));

    // 2. مخصوص اسکرپٹ لنکس کو تلاش کریں (جو اکثر APIs چھپاتے ہیں)
    const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/g;
    let m;
    const jsFiles = [];
    while ((m = scriptRegex.exec(html)) !== null) {
      let jsUrl = m[1];
      if (!jsUrl.startsWith('http')) {
        const base = new URL(targetUrl).origin;
        jsUrl = new URL(jsUrl, base).href;
      }
      jsFiles.push(jsUrl);
    }

    // 3. ٹاپ 3 جے ایس فائلوں کو اسکین کریں (زیادہ کرنے سے سرور سلو ہو جاتا ہے)
    for (let i = 0; i < Math.min(jsFiles.length, 3); i++) {
      try {
        const jsRes = await axios.get(jsFiles[i], { timeout: 5000 });
        const jsLinks = jsRes.data.match(linkRegex);
        if (jsLinks) jsLinks.forEach(l => endpoints.add(l));
      } catch (e) {}
    }

    // فلٹر: صرف وہ لنکس جو ممکنہ طور پر APIs ہو سکتے ہیں
    const filtered = [...endpoints].filter(link => 
      (link.includes('api') || link.includes('convert') || link.includes('download') || link.includes('.org')) &&
      !link.includes('google') && !link.includes('facebook') && !link.includes('twitter') && !link.includes('w3.org')
    );

    res.json({
      success: true,
      found_endpoints: filtered.slice(0, 50)
    });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};