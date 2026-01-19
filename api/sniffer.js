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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    const $ = cheerio.load(response.data);
    const endpoints = [];

    $('script').each((i, el) => {
      const content = $(el).html();
      const matches = content ? content.match(/https?:\/\/[^\s"'`<>]+/g) : null;
      if (matches) endpoints.push(...matches);
    });

    $('form').each((i, el) => {
      const action = $(el).attr('action');
      if (action) endpoints.push(action);
    });

    const filtered = endpoints.filter(link => 
      link.includes('api') || 
      link.includes('download') || 
      link.includes('convert') || 
      link.includes('token')
    );

    res.json({
      success: true,
      website: targetUrl,
      found_endpoints: [...new Set(filtered)]
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
