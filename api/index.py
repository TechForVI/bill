from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def scrape_fesco_bill(reference_id):
    url = f"https://bill.pitc.com.pk/fescobill/general?ref={reference_id}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return {"error": "Website not responding"}

        soup = BeautifulSoup(response.text, 'html.parser')
        all_tds = soup.find_all('td')
        data_list = [td.get_text(strip=True) for td in all_tds]

        if len(data_list) < 20:
            return {"error": "Reference number not found"}

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