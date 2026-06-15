# test_client_runner.py
import requests
import json

API_BASE = "http://localhost:8181/api"
TEST_FILE_PATH = "C:/Users/charlie/Documents/Development/CLog/Server/syslog_trunc_jun14.log"

# Store panel-to-fileId mapping
loaded_files = {}

def list_files():
    r = requests.get(f"{API_BASE}/files")
    return r.json()

def load_file(panel_id, file_path):
    url = f"{API_BASE}/files/load"
    payload = {"panelId": panel_id, "filePath": file_path}
    r = requests.post(url, json=payload)
    if r.status_code == 200:
        try:
            result = r.json()
            if result.get("success") and result.get("fileId"):
                loaded_files[panel_id] = result["fileId"]
        except Exception:
            pass
    return r

def filter_events(panel_id, filters):
    if panel_id not in loaded_files:
        return {"error": f"No file loaded in panel '{panel_id}'"}
    url = f"{API_BASE}/panels/filter"
    payload = {"panelId": panel_id, "filters": filters}
    return requests.post(url, json=payload)

def main():
    while True:
        print("""
 --- CLog Backend Test Client ---
 1. List files
 2. Load file
 3. Filter events
 4. Get file info
 5. Get file contents
 6. Index file
 7. Find sequence pattern
 8. WebSocket: Index progress
 9. WebSocket: Tail stream
 q. Quit
        """)
        choice = input("Choose an option (e.g. 3a or 7c): ").strip()

        if choice == 'q':
            break

        try:
            if choice == '1':
                r = list_files()
                print(json.dumps(r, indent=2))

            elif choice == '2':
                file_path = input("Enter file path: ").strip()
                panel_id = input("Enter panel id (left/right): ").strip()
                r = load_file(panel_id, file_path)
                print(json.dumps(r.json(), indent=2))

            elif choice == '2a':
                r = load_file("left", TEST_FILE_PATH)
                try:
                    print(json.dumps(r.json(), indent=2))
                except Exception:
                    print(r.text)

            elif choice == '3a':
                filters = {
                    "include": [],
                    "exclude": [],
                    "timeRange": None,
                    "structuredFields": {}
                }
                r = filter_events("left", filters)
                if isinstance(r, dict):
                    print(json.dumps(r, indent=2))
                else:
                    print(json.dumps(r.json(), indent=2))

            else:
                print("Unsupported option")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
