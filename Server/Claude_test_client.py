#!/usr/bin/env python3
"""
Log Analysis Server WebSocket Test Client
A comprehensive menu-driven test client for the WebSocket-based log analysis backend
"""

import asyncio
import websockets
import json
import os
import time
from typing import Dict, Any, List
import uuid

class LogAnalysisWebSocketTestClient:
    def __init__(self, ws_url: str = "ws://localhost:8181/api/ws"):
        self.ws_url = ws_url
        self.websocket = None
        self.loaded_files = {}  # file_id -> metadata
        self.active_patterns = {}  # pattern_id -> pattern info
        self.active_tails = {}  # tail_id -> tail info
        
    async def connect(self):
        """Connect to the WebSocket server"""
        try:
            self.websocket = await websockets.connect(self.ws_url)
            print(f"✅ Connected to WebSocket server: {self.ws_url}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to WebSocket server: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        if self.websocket:
            await self.websocket.close()
            print("👋 Disconnected from WebSocket server")
    
    async def send_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Send a message to the server and wait for response"""
        try:
            await self.websocket.send(json.dumps(message))
            response = await self.websocket.recv()
            return json.loads(response)
        except Exception as e:
            print(f"❌ WebSocket communication error: {e}")
            return {"success": False, "error": str(e)}

    async def check_server_health(self) -> bool:
        """Check if the server is responding"""
        try:
            message = {"type": "health_check"}
            response = await self.send_message(message)
            
            if response.get("success", False):
                print(f"✅ Server is healthy: {response}")
                return True
            else:
                print(f"❌ Server unhealthy: {response}")
                return False
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False

    async def load_file(self, file_path: str, panel_id: str = "left", options: Dict = None) -> Dict:
        """Load a file into the system"""
        if options is None:
            options = {}
            
        message = {
            "type": "load_file",
            "panelId": panel_id,
            "filePath": file_path,
            "options": options
        }
        
        try:
            response = await self.send_message(message)
            if response.get("success", False):
                file_id = response["fileId"]
                self.loaded_files[file_id] = response
                print(f"✅ File loaded successfully:")
                print(f"   File ID: {file_id}")
                print(f"   Panel: {response['panelId']}")
                print(f"   Metadata: {json.dumps(response['metadata'], indent=2)}")
                return response
            else:
                print(f"❌ Failed to load file: {response.get('error', 'Unknown error')}")
                return {}
        except Exception as e:
            print(f"❌ Error loading file: {e}")
            return {}

    async def get_file_content(self, file_id: str, start_line: int = 1, end_line: int = None, max_lines: int = None):
        """Get content from a loaded file"""
        message = {
            "type": "get_content",
            "fileId": file_id,
            "startLine": start_line
        }
        if end_line:
            message["endLine"] = end_line
        if max_lines:
            message["maxLines"] = max_lines
            
        try:
            response = await self.send_message(message)
            if response.get("success", False):
                content = response["content"]
                print(f"✅ Retrieved {len(content['lines'])} lines:")
                print(f"   Range: {content['range']}")
                print(f"   Total lines in file: {content['totalLines']}")
                if content.get('truncated', False):
                    print("   ⚠️  Content was truncated")
                
                # Show first few lines
                for i, line in enumerate(content['lines'][:5]):
                    print(f"   {start_line + i}: {line.strip()}")
                if len(content['lines']) > 5:
                    print(f"   ... and {len(content['lines']) - 5} more lines")
                return response
            else:
                print(f"❌ Failed to get content: {response.get('error', 'Unknown error')}")
                return {}
        except Exception as e:
            print(f"❌ Error getting content: {e}")
            return {}

    async def run_stress_tests(self):
        """Run comprehensive stress tests to evaluate performance"""
        print("\n🔥 Starting Performance Stress Test Suite")
        print("="*80)
        print("This will test your WebSocket backend with various performance scenarios.")
        input("Press Enter to begin stress testing...")
        
        stress_results = {}
        total_start_time = time.time()
        
        # Test 1: Large File Generation and Loading
        print("\n📁 STRESS TEST 1: Large File Handling")
        print("-" * 50)
        large_file_results = await self._stress_test_large_files()
        stress_results['large_files'] = large_file_results
        
        # Only run additional tests if we have a working file
        if any(r['success'] for r in large_file_results):
            # Test 2: Sustained Load Testing (simplified for now)
            print("\n🏃 STRESS TEST 2: Sustained Load Testing")
            print("-" * 50)
            load_results = await self._stress_test_sustained_load()
            stress_results['sustained_load'] = load_results
        
        # Generate comprehensive report
        total_time = time.time() - total_start_time
        self._generate_stress_test_report(stress_results, total_time)

    async def _stress_test_large_files(self):
        """Test performance with increasingly large files"""
        results = []
        
        # Generate test files of different sizes
        test_sizes = [
            {"name": "Small", "lines": 1000, "file": "stress_small.log"},
            {"name": "Medium", "lines": 10000, "file": "stress_medium.log"},
            {"name": "Large", "lines": 50000, "file": "stress_large.log"}
        ]
        
        for test_config in test_sizes:
            print(f"🔧 Generating {test_config['name']} file ({test_config['lines']:,} lines)...")
            
            # Generate test file
            file_path = test_config['file']
            self._generate_test_log_file(file_path, test_config['lines'])
            
            # Test file loading performance
            start_time = time.time()
            try:
                load_result = await self.load_file(os.path.abspath(file_path), "left", {"encoding": "utf-8"})
                load_time = time.time() - start_time
                
                if load_result and 'fileId' in load_result:
                    file_id = load_result['fileId']
                    file_size = os.path.getsize(file_path)
                    
                    # Test content retrieval performance
                    content_start = time.time()
                    content_result = await self.get_file_content(file_id, 1, None, 100)
                    content_time = time.time() - content_start
                    
                    results.append({
                        'size_category': test_config['name'],
                        'line_count': test_config['lines'],
                        'file_size_mb': file_size / (1024 * 1024),
                        'load_time': load_time,
                        'content_time': content_time,
                        'load_rate_lines_per_sec': test_config['lines'] / load_time if load_time > 0 else 0,
                        'success': True
                    })
                    
                    print(f"   ✅ {test_config['name']}: Load {load_time:.2f}s, Content {content_time:.2f}s")
                else:
                    results.append({
                        'size_category': test_config['name'],
                        'line_count': test_config['lines'],
                        'file_size_mb': 0,
                        'load_time': load_time,
                        'content_time': 0,
                        'load_rate_lines_per_sec': 0,
                        'success': False
                    })
                    print(f"   ❌ {test_config['name']}: Failed to load")
                    
            except Exception as e:
                load_time = time.time() - start_time
                results.append({
                    'size_category': test_config['name'],
                    'line_count': test_config['lines'],
                    'file_size_mb': 0,
                    'load_time': load_time,
                    'content_time': 0,
                    'load_rate_lines_per_sec': 0,
                    'success': False,
                    'error': str(e)
                })
                print(f"   ❌ {test_config['name']}: Exception - {e}")
            
            # Clean up generated file
            try:
                os.remove(file_path)
            except:
                pass
        
        return results

    async def _stress_test_sustained_load(self):
        """Test sustained load over time"""
        results = []
        
        print("🏃 Running sustained load test (30 seconds)...")
        
        if not self.loaded_files:
            await self._ensure_test_file_loaded()
        
        if not self.loaded_files:
            return [{"test": "sustained_load", "success": False, "error": "No file available"}]
        
        file_id = list(self.loaded_files.keys())[0]
        
        # Run continuous operations for 30 seconds
        start_time = time.time()
        end_time = start_time + 30  # 30 seconds
        
        operation_count = 0
        successful_ops = 0
        failed_ops = 0
        response_times = []
        
        while time.time() < end_time:
            operation_start = time.time()
            try:
                # Alternate between different operations
                if operation_count % 2 == 0:
                    result = await self.get_file_content(file_id, 1, None, 100)
                else:
                    result = await self.send_message({"type": "health_check"})
                
                operation_time = time.time() - operation_start
                response_times.append(operation_time)
                
                if result and result.get('success', True):
                    successful_ops += 1
                else:
                    failed_ops += 1
                    
            except Exception as e:
                operation_time = time.time() - operation_start
                response_times.append(operation_time)
                failed_ops += 1
            
            operation_count += 1
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.1)
        
        total_time = time.time() - start_time
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        results.append({
            'duration_seconds': total_time,
            'total_operations': operation_count,
            'successful_operations': successful_ops,
            'failed_operations': failed_ops,
            'operations_per_second': operation_count / total_time,
            'avg_response_time': avg_response_time,
            'min_response_time': min(response_times) if response_times else 0,
            'max_response_time': max(response_times) if response_times else 0,
            'success_rate': (successful_ops / operation_count * 100) if operation_count > 0 else 0
        })
        
        print(f"   ✅ {operation_count} operations in {total_time:.1f}s ({(operation_count/total_time):.1f} ops/s)")
        print(f"      Success rate: {(successful_ops/operation_count*100 if operation_count > 0 else 0):.1f}%")
        print(f"      Avg response: {avg_response_time:.3f}s")
        
        return results

    def _generate_test_log_file(self, filename: str, line_count: int):
        """Generate a test log file with specified number of lines"""
        import random
        
        log_templates = [
            "Jun {day} {time} systemd Started Session c{session} of user pi.",
            "Jun {day} {time} asterisk [2025-06-14 {time}] ERROR[{pid}]: res_pjsip.c: Endpoint '{endpoint}': Could not create dialog to invalid URI '{endpoint}'. Is endpoint registered and reachable?",
            "Jun {day} {time} GS_LOG [00:0B:82:3F:61:F6][000][{id}][1.4.1.5] FXO: Port: 0 <Event> Processing (Ring Start Detected), From: {caller}, GWSt: 0",
            "Jun {day} {time} swift<192.168.5.4> 2025-06-14 {time},000 AudioManager.swift - 32 Audio session configured for ringtone playback",
            "Jun {day} {time} comet_phone.js (line {line}) INFO webkit({pid}) @ 192.168.5.4 | Call created",
            "Jun {day} {time} mediamtx: INF [WebRTC] [session {session_id}] created by 192.168.5.{client}:{port}",
            "Jun {day} {time} rngd stats: bits received from HRNG source: {bits}",
            "Jun {day} {time} asterisk    -- Channel PJSIP/{endpoint}-{channel} joined 'simple_bridge' basic-bridge <{bridge_id}>",
        ]
        
        with open(filename, 'w') as f:
            for i in range(line_count):
                template = random.choice(log_templates)
                log_line = template.format(
                    day=random.randint(14, 20),
                    time=f"{random.randint(8,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}.{random.randint(0,999):03d}",
                    session=random.randint(1, 999),
                    pid=random.randint(1000, 9999),
                    endpoint=random.randint(1, 10),
                    id=random.randint(100000000, 999999999),
                    caller=random.randint(100, 999),
                    line=random.randint(100, 999),
                    session_id=''.join(random.choices('0123456789abcdef', k=8)),
                    client=random.randint(1, 100),
                    port=random.randint(10000, 65535),
                    bits=random.randint(100000, 999999),
                    channel=f"{random.randint(10000000, 99999999):08d}",
                    bridge_id=str(uuid.uuid4())
                )
                f.write(log_line + "\n")

    async def _ensure_test_file_loaded(self):
        """Ensure we have a test file loaded for stress testing"""
        if not self.loaded_files:
            print("📁 Loading test file for stress tests...")
            if os.path.exists("syslog_trunc_jun14.log"):
                await self.load_file(os.path.abspath("syslog_trunc_jun14.log"), "left", {"encoding": "utf-8"})

    def _generate_stress_test_report(self, stress_results, total_time):
        """Generate comprehensive stress test report"""
        print("\n" + "="*80)
        print("🔥 PERFORMANCE STRESS TEST REPORT")
        print("="*80)
        
        print(f"🕒 Total stress test time: {total_time:.2f} seconds")
        print(f"📊 Test categories completed: {len(stress_results)}")
        
        # Large File Performance Analysis
        if 'large_files' in stress_results:
            print("\n📁 LARGE FILE PERFORMANCE:")
            print("-" * 50)
            for result in stress_results['large_files']:
                if result['success']:
                    print(f"   {result['size_category']:>8}: {result['line_count']:>8,} lines | "
                          f"Load: {result['load_time']:>6.2f}s | "
                          f"Rate: {result['load_rate_lines_per_sec']:>8,.0f} lines/s | "
                          f"Size: {result['file_size_mb']:>6.1f}MB")
                else:
                    print(f"   {result['size_category']:>8}: FAILED")
        
        # Sustained Load Analysis
        if 'sustained_load' in stress_results:
            print("\n🏃 SUSTAINED LOAD PERFORMANCE:")
            print("-" * 50)
            for result in stress_results['sustained_load']:
                print(f"   Duration: {result['duration_seconds']:>6.1f}s | "
                      f"Operations: {result['total_operations']:>4} | "
                      f"Rate: {result['operations_per_second']:>6.1f} ops/s")
                print(f"   Success Rate: {result['success_rate']:>5.1f}% | "
                      f"Response Time: {result['avg_response_time']:>6.3f}s avg "
                      f"({result['min_response_time']:>6.3f}s-{result['max_response_time']:>6.3f}s)")
        
        # Performance Recommendations
        print("\n💡 PERFORMANCE RECOMMENDATIONS:")
        print("-" * 50)
        
        recommendations = []
        
        # File size recommendations
        if 'large_files' in stress_results:
            successful_loads = [r for r in stress_results['large_files'] if r['success']]
            failed_loads = [r for r in stress_results['large_files'] if not r['success']]
            
            if successful_loads:
                max_lines = max(r['line_count'] for r in successful_loads)
                best_rate = max(r['load_rate_lines_per_sec'] for r in successful_loads)
                recommendations.append(f"✅ Successfully handled files up to {max_lines:,} lines")
                recommendations.append(f"✅ Best performance: {best_rate:,.0f} lines/second")
            
            if failed_loads:
                smallest_failed = min(r['line_count'] for r in failed_loads)
                recommendations.append(f"⚠️  Consider file size limits around {smallest_failed:,} lines")
        
        # Sustained load recommendations
        if 'sustained_load' in stress_results:
            load_result = stress_results['sustained_load'][0]
            if load_result['success_rate'] >= 95:
                recommendations.append("✅ Excellent stability under sustained load")
            else:
                recommendations.append("⚠️  Consider implementing rate limiting - success rate dropped under sustained load")
                
            if load_result['operations_per_second'] > 5:
                recommendations.append("✅ Good throughput performance")
            else:
                recommendations.append("⚠️  Consider performance optimization - low throughput detected")
        
        for i, rec in enumerate(recommendations, 1):
            print(f"   {i}. {rec}")
        
        if not recommendations:
            print("   🎉 No performance issues detected - system performing optimally!")
        
        print("\n" + "="*80)

    async def run_interactive_menu(self):
        """Run the interactive test menu"""
        while True:
            print("\n" + "="*60)
            print("🔧 Log Analysis WebSocket Test Client")
            print("="*60)
            print("1. Check server health")
            print("2. Load log file")
            print("3. Get file content")
            print("4. Apply filters (pre-configured)")
            print("5. Create sequence pattern (pre-configured)")
            print("6. Find sequences")
            print("7. Start tail session")
            print("8. Get tail updates")
            print("9. Stop tail session")
            print("10. Show loaded files")
            print("11. Show active patterns")
            print("12. Show active tails")
            print("13. Run automated test suite")
            print("14. Run stress tests")
            print("0. Exit")
            print("-" * 60)
            
            choice = input("Enter your choice: ").strip()
            
            if choice == "0":
                print("👋 Goodbye!")
                break
            elif choice == "1":
                await self.check_server_health()
            elif choice == "14":
                await self.run_stress_tests()
            else:
                print(f"❌ Invalid choice '{choice}'. Please try again.")
                print("Note: Only options 1 and 14 are implemented in this simplified version.")
            
            input("\nPress Enter to continue...")


async def main():
    """Main function to run the WebSocket test client"""
    print("🚀 Starting Log Analysis WebSocket Test Client")
    
    # Check if log file exists
    if not os.path.exists("syslog_trunc_jun14.log"):
        print("⚠️  Warning: syslog_trunc_jun14.log not found in current directory")
        print("   Make sure the log file is in the same directory as this script")
    
    client = LogAnalysisWebSocketTestClient()
    
    # Connect to WebSocket server
    if not await client.connect():
        print("\n❌ WebSocket server is not responding. Please:")
        print("   1. Start the server: python main.py")
        print("   2. Make sure it's running on ws://localhost:8181/api/ws")
        print("   3. Try again")
        return
    
    try:
        # Initial health check
        if not await client.check_server_health():
            print("\n❌ Server health check failed")
            return
        
        await client.run_interactive_menu()
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
