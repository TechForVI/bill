const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const { targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: "Target URL is required" });
  }

  try {
    // 1. ویب سائٹ کا مین پیج لوڈ کریں
    const response = await axios.get(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const jsFiles = [];
    const allEndpoints = new Set();

    // 2. پیج پر موجود تمام JS فائلوں کے لنکس نکالیں
    $('script').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        if (src.startsWith('http')) {
          jsFiles.push(src);
        } else {
          const baseUrl = new URL(targetUrl).origin;
          jsFiles.push(new URL(src, baseUrl).href);
        }
      } else {
        // اگر اسکرپٹ پیج کے اندر ہی لکھا ہے (Inline JS)
        const inlineCode = $(el).html();
        findEndpoints(inlineCode, allEndpoints);
      }
    });

    // 3. ہر JS فائل کو کھول کر اس کے اندر سے لنکس تلاش کریں
    const jsRequests = jsFiles.map(url => 
      axios.get(url, { timeout: 5000 }).catch(() => null)
    );
    
    const jsResponses = await Promise.all(jsRequests);
    jsResponses.forEach(res => {
      if (res && res.data) {
        findEndpoints(res.data, allEndpoints);
      }
    });

    // فلٹر کریں تاکہ صرف کام کے لنکس (API/Download) بچیں
    const filtered = [...allEndpoints].filter(link => 
      (link.includes('api') || link.includes('download') || link.includes('convert') || link.includes('v1')) &&
      !link.includes('google') && !link.includes('facebook') && !link.includes('twitter')
    );

    res.json({
      success: true,
      found_endpoints: filtered
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ہیلپر فنکشن: ٹیکسٹ میں سے یو آر ایل ڈھونڈنے کے لیے
function findEndpoints(text, set) {
  if (!text) return;
  const regex = /https?:\/\/[^\s"'`<>]+/g;
  const matches = text.match(regex);
  if (matches) {
    matches.forEach(m => set.add(m));
  }
}