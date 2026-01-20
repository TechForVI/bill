const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const { targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: "Target URL is required" });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const endpoints = [];

    // تمام Scripts، AJAX کالز اور لنکس کو جمع کریں
    $('script, a, form, link').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('href') || $(el).attr('action');
      const content = $(el).html();
      
      if (src && src.startsWith('http')) endpoints.push(src);
      
      if (content) {
        const matches = content.match(/https?:\/\/[^\s"'`<>]+/g);
        if (matches) endpoints.push(...matches);
      }
    });

    // فلٹر کو وسیع کر دیں تاکہ کچھ بھی مس نہ ہو
    const filtered = [...new Set(endpoints)].filter(link => 
      !link.includes('google-analytics') && 
      !link.includes('fonts.googleapis') &&
      !link.includes('facebook.com')
    );

    res.json({
      success: true,
      found_endpoints: filtered.slice(0, 50) // پہلے 50 لنکس دکھائیں
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};