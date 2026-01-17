export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return new Response(JSON.stringify({ error: "Reference number is required" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const targetUrl = `https://bill.pitc.com.pk/fescobill/general?ref=${ref}`;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const html = await response.text();

      const extract = (regex) => {
        const match = html.match(regex);
        return match ? match[1].trim() : "N/A";
      };

      const data = {
        status: "Success",
        consumer_name: extract(/Name:<\/td>\s*<td[^>]*>(.*?)<\/td>/i),
        billing_month: extract(/Month:<\/td>\s*<td[^>]*>(.*?)<\/td>/i),
        due_date: extract(/Due Date:<\/td>\s*<td[^>]*>(.*?)<\/td>/i),
        payable_within_due: extract(/Within Due Date:<\/td>\s*<td[^>]*>(.*?)<\/td>/i),
        payable_after_due: extract(/After Due Date:<\/td>\s*<td[^>]*>(.*?)<\/td>/i),
        bill_url: targetUrl
      };

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};