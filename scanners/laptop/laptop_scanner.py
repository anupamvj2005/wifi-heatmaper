import requests
import time
import subprocess
import platform
import json

# IP of the MAIN computer running app.py
SERVER_IP = "192.168.1.10" # 
SERVER_PORT = "5000"
UPDATE_URL = f"http://{SERVER_IP}:{SERVER_PORT}/update-signal"

def get_wifi_signal():
    """
    Cross-platform method to get Wi-Fi signal strength (0-100%).
    """
    os_type = platform.system()
    signal_strength = 0

    try:
        if os_type == "Windows":
            output = subprocess.check_output("netsh wlan show interfaces", shell=True).decode("utf-8", errors="ignore")
            for line in output.split('\n'):
                if "Signal" in line:
                    parts = line.split(":")
                    if len(parts) > 1:
                        signal_strength = int(parts[1].replace("%", "").strip())
                        return signal_strength

        elif os_type == "Linux":
            output = subprocess.check_output("nmcli -f IN-USE,SIGNAL dev wifi", shell=True).decode("utf-8", errors="ignore")
            for line in output.split('\n'):
                if "*" in line: # The connected network has a *
                    parts = line.split()
                    signal_strength = int(parts[-1])
                    return signal_strength
                    
    except Exception as e:
        print(f"Error reading signal: {e}")
        
    return 0 # Default if failed

def main():
    print(f"--- Remote Laptop Scanner Started ---")
    print(f"Target Server: {UPDATE_URL}")
    print("Press Ctrl+C to stop.\n")

    while True:
        # 1. Get Signal
        signal = get_wifi_signal()
        
        # 2. Prepare Payload
        # We send percentage directly from laptop
        payload = {
            "signal": signal,
            "device": "remote_laptop"
        }

        # 3. Send to Server
        try:
            response = requests.post(UPDATE_URL, json=payload, timeout=2)
            if response.status_code == 200:
                print(f"✅ Sent: {signal}% | Server: OK")
            else:
                print(f"⚠️ Server returned {response.status_code}")
        except requests.exceptions.RequestException:
            print(f"❌ Connection Failed. Is the server running at {SERVER_IP}?")

        # 4. Wait
        time.sleep(2)

if __name__ == "__main__":
    main()