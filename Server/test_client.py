# test_client.py
import requests
import json
import websockets
import asyncio

BASE_URL = "http://127.0.0.1:8181"
WS_URL = "ws://127.0.0.1:8181"

def list_files():
    r = requests.get(f"{BASE_URL}/api/files")
    print(r.json())

def load_file(panel_id, file_path):
    payload = {"panelId": panel_id, "filePath": file_path}
    r = requests.post(f"{BASE_URL}/api/files/load", json=payload)
    print(r.json())

def filter_events(panel_id, process_names):
    payload = {"panelId": panel_id, "filters": {"processes": process_names}}
    r = requests.post(f"{BASE_URL}/api/files/filter", json=payload)
    print(r.json())

def get_file_info(file_id):
    r = requests.get(f"{BASE_URL}/api/files/info/{file_id}")
    print(r.json())

def get_file_contents(file_id):
    r = requests.get(f"{BASE_URL}/api/files/contents/{file_id}")
    print(r.json())

def index_file(panel_id):
    payload = {"panelId": panel_id}
    r = requests.post(f"{BASE_URL}/api/files/index", json=payload)
    print(r.json())

def find_sequence_pattern(panel_id, pattern):
    payload = {"panelId": panel_id, "pattern": pattern}
    r = requests.post(f"{BASE_URL}/api/sequence", json=payload)
    print(r.json())

async def ws_index_progress(file_id):
    async with websockets.connect(f"{WS_URL}/api/ws/indexing/{file_id}") as ws:
        try:
            async for message in ws:
                print(message)
        except websockets.ConnectionClosed:
            print("WebSocket closed")

async def ws_tail_stream(file_id):
    async with websockets.connect(f"{WS_URL}/api/ws/tail/{file_id}") as ws:
        await ws.send(json.dumps({"action": "subscribe"}))
        try:
            async for message in ws:
                print(message)
        except websockets.ConnectionClosed:
            print("WebSocket closed")
