from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def scrape_fesco_bill(reference_id):
    # ہم مکمل یو آر ایل استعمال کر رہے ہیں
    url = f"https://bill.pitc.com.pk/fescobill/general?ref={reference_id}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

    try:
        # یہاں ہم نے 20 سیکنڈ کا ٹائم آؤٹ لگایا ہے تاکہ سرور جلدی ہمت نہ ہارے
        response = requests.get(url, headers=headers, timeout=20)
        
        if response.status_code != 200:
            return {"error": f"Website returned status code: {response.status_code}"}

        soup = BeautifulSoup(response.text, 'html.parser')
        all_tds = soup.find_all('td')
        data_list = [td.get_text(strip=True) for td in all_tds]

        if len(data_list) < 20:
            return {"error": "Invalid Reference Number or Data not found"}

        res = {
            "status": "Success",
            "print_url": url,
            "consumer_name": data_list[15] if len(data_list) > 15 else "N/A",
            "address": data_list[17] if len(data_list) > 17 else "N/A",
            "billing_month": data_list[20] if len(data_list) > 20 else "N/A",
            "due_date": data_list[22] if len(data_list) > 22 else "N/A",
            "units_consumed": data_list[35] if len(data_list) > 35 else "0",
            "payable_within_due": data_list[45] if len(data_list) > 45 else "0",
            "late_surcharge": data_list[47] if len(data_list) > 47 else "0",
            "payable_after_due": data_list[49] if len(data_list) > 49 else "0"
        }
        return res

    except requests.exceptions.Timeout:
        return {"error": "Connection Timeout: FESCO server is slow. Please try again."}
    except Exception as e:
        return {"error": str(e)}

@app.route('/')
def home():
    ref = request.args.get('ref')
    if not ref:
        return jsonify({"error": "Reference number required"})
    return jsonify(scrape_fesco_bill(ref))

if __name__ == '__main__':
    app.run(debug=True)