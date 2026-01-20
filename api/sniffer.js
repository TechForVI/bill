const axios = require('axios');

module.exports = async (req, res) => {
  const { targetUrl } = req.query;
  if (!targetUrl) return res.status(400).json({ error: "URL missing" });

  try {
    // ویب سائٹ کا پورا ٹیکسٹ (Source Code) حاصل کریں
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    
    const html = response.data;
    const endpoints = new Set();

    // پیٹرن 1: وہ تمام ڈومینز جو 'api' یا 'convert' سے شروع ہوں
    const regex1 = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:api|convert|download|stream)[a-zA-Z0-9-.]+\.[a-z]{2,}(?:\/[^\s"'`<>]+)?/g;
    
    // پیٹرن 2: جاوا اسکرپٹ کے اندر موجود اینڈ پوائنٹس جو اکثر /api/v1/ کی شکل میں ہوتے ہیں
    const regex2 = /"(\/api\/[^\s"'`<>]+)"|'(\/api\/[^\s"'`<>]+)'/g;

    let match;
    while ((match = regex1.exec(html)) !== null) endpoints.add(match[0]);
    while ((match = regex2.exec(html)) !== null) endpoints.add(match[1] || match[2]);

    // اگر کچھ نہ ملے تو تمام لنکس نکالیں جو .org یا .com پر ختم ہوں
    if (endpoints.size === 0) {
       const generalRegex = /https?:\/\/[a-zA-Z0-9.-]+\.(?:org|com|net|io)(?:\/[^\s"'`<>]+)?/g;
       while ((match = generalRegex.exec(html)) !== null) endpoints.add(match[0]);
    }

    res.json({
      success: true,
      found_endpoints: [...endpoints].filter(link => !link.includes('google') && !link.includes('w3.org')).slice(0, 40)
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};