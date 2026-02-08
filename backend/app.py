from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import intelligence
import utils

app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
CORS(app)

# Global variable for live sensor data
latest_signal = -100

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update-sensor', methods=['POST'])
def update_sensor():
    global latest_signal
    try:
        data = request.get_json()
        if data and 'signal' in data:
            latest_signal = int(data['signal'])
            return jsonify({"status": "success", "signal": latest_signal}), 200
        return jsonify({"status": "error"}), 400
    except:
        return jsonify({"status": "error"}), 500

@app.route('/get-live', methods=['GET'])
def get_live():
    device = request.args.get('device', 'laptop')
    if device == 'esp32':
        # Use util function to check status based on global signal
        status = utils.get_status_from_signal(latest_signal)
        return jsonify({"signal": latest_signal, "status": status})
    else:
        # Use util function to generate fake signal
        fake_signal = utils.generate_fake_signal()
        return jsonify({"signal": fake_signal, "status": "online"})

@app.route('/measure', methods=['POST'])
def measure():
    return jsonify({"status": "saved"}), 200

@app.route('/analytics', methods=['POST'])
def analytics():
    data = request.get_json()
    points = data.get('points', [])
    
    # Use intelligence module to process data
    result = intelligence.analyze_coverage_data(points)
    
    if result is None:
        return jsonify({"status": "error", "message": "No data points to analyze."})

    return jsonify({
        "status": "success",
        "heatmap_data": result['heatmap_data'],
        "recommendation": result['recommendation']
    })

@app.route('/reset', methods=['POST'])
def reset():
    global latest_signal
    latest_signal = -100
    return jsonify({"status": "reset"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)