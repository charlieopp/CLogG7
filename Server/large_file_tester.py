#!/usr/bin/env python3
"""
Large File Performance Tester
A focused test program for debugging large file handling in the WebSocket log analysis backend
"""

import asyncio
import websockets
import json
import os
import time
from typing import Dict, Any, List
import uuid

class LargeFilePerformanceTester:
    def __init__(self, ws_url: str = "ws://localhost:8181/api/ws"):
        self.ws_url = ws_url
        self.websocket = None
        self.loaded_files = {}  # file_id -> metadata
        
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
    
    async def send_message_with_debug(self, message: Dict[str, Any], operation_name: str) -> Dict[str, Any]:
        """Send a message with full JSON debugging"""
        try:
            message_str = json.dumps(message, indent=2)
            print(f"\n🔍 {operation_name} - SENDING JSON:")
            print("=" * 80)
            print(message_str)
            print("=" * 80)
            
            await self.websocket.send(json.dumps(message))
            
            response_str = await self.websocket.recv()
            response = json.loads(response_str)
            
            print(f"\n📨 {operation_name} - RECEIVED JSON:")
            print("=" * 80)
            print(json.dumps(response, indent=2))
            print("=" * 80)
            
            return response
        except Exception as e:
            print(f"❌ WebSocket communication error in {operation_name}: {e}")
            return {"success": False, "error": str(e)}

    async def load_file(self, file_path: str, panel_id: str = "left", options: Dict = None) -> Dict:
        """Load a file into the system with debug output"""
        if options is None:
            options = {}
            
        message = {
            "type": "load_file",
            "panelId": panel_id,
            "filePath": file_path,
            "options": options
        }
        
        print(f"\n📁 Loading file: {file_path}")
        file_size = os.path.getsize(file_path) / (1024 * 1024) if os.path.exists(file_path) else 0
        print(f"📏 File size: {file_size:.2f} MB")
        
        start_time = time.time()
        response = await self.send_message_with_debug(message, "LOAD_FILE")
        load_time = time.time() - start_time
        
        # Handle different response formats from your server
        if response.get("type") == "error":
            print(f"❌ Failed to load file: {response.get('message', 'Unknown error')}")
            print(f"⏱️  Load attempt took: {load_time:.3f} seconds")
            return {}
        elif response.get("type") == "load_file_result" and response.get("success", False):
            # Your server returns this format
            file_id = response["fileId"]
            self.loaded_files[file_id] = response
            line_count = response.get('metadata', {}).get('lineCount', 0)
            load_rate = line_count / load_time if load_time > 0 else 0
            
            print(f"✅ File loaded successfully:")
            print(f"   File ID: {file_id}")
            print(f"   Panel: {response['panelId']}")
            print(f"   Load time: {load_time:.3f} seconds")
            print(f"   Line count: {line_count:,}")
            print(f"   Load rate: {load_rate:,.0f} lines/second")
            return response
        elif response.get("success", False) or response.get("fileId"):
            # Fallback for direct success response
            file_id = response["fileId"]
            self.loaded_files[file_id] = response
            line_count = response.get('metadata', {}).get('lineCount', 0)
            load_rate = line_count / load_time if load_time > 0 else 0
            
            print(f"✅ File loaded successfully:")
            print(f"   File ID: {file_id}")
            print(f"   Panel: {response['panelId']}")
            print(f"   Load time: {load_time:.3f} seconds")
            print(f"   Line count: {line_count:,}")
            print(f"   Load rate: {load_rate:,.0f} lines/second")
            return response
        else:
            print(f"❌ Unexpected response format")
            print(f"   Response type: {response.get('type', 'No type field')}")
            print(f"   Response keys: {list(response.keys())}")
            print(f"⏱️  Load attempt took: {load_time:.3f} seconds")
            return {}

    async def apply_filters_with_debug(self, file_id: str, filters: List[Dict], panel_id: str = "left", options: Dict = None):
        """Apply filters to a file with detailed debugging"""
        if options is None:
            options = {}
            
        message = {
            "type": "filter",
            "fileId": file_id,
            "panelId": panel_id,
            "filters": filters,
            "options": options
        }
        
        filter_description = self._describe_filters(filters)
        print(f"\n🔍 Applying filters: {filter_description}")
        
        start_time = time.time()
        response = await self.send_message_with_debug(message, "APPLY_FILTERS")
        filter_time = time.time() - start_time
        
        return response

    def _describe_filters(self, filters: List[Dict]) -> str:
        """Create a human-readable description of the filters"""
        descriptions = []
        for f in filters:
            if f['type'] == 'text':
                op = f['operation']
                text = f['parameters']['text']
                descriptions.append(f"{op} text '{text}'")
            elif f['type'] == 'regex':
                op = f['operation']
                pattern = f['parameters']['pattern']
                descriptions.append(f"{op} regex '{pattern}'")
        return "; ".join(descriptions)

    async def test_small_file(self):
        """Test with small file first to establish baseline"""
        print("\n" + "="*80)
        print("📝 SMALL FILE BASELINE TEST")
        print("="*80)
        
        small_file = "syslog_trunc_jun14_orig.log"
        
        if not os.path.exists(small_file):
            print(f"❌ Small test file not found: {small_file}")
            print("   Please ensure this file exists in the current directory")
            return None
        
        file_size = os.path.getsize(small_file) / (1024 * 1024)
        print(f"📁 Testing baseline file: {small_file}")
        print(f"📏 File size: {file_size:.2f} MB")
        
        # Load the small file
        load_result = await self.load_file(os.path.abspath(small_file), "left", {"encoding": "utf-8"})
        
        if not load_result or 'fileId' not in load_result:
            print("❌ Failed to load small file - aborting tests")
            return None
        
        file_id = load_result['fileId']
        
        # Test basic search operations on small file
        print(f"🔍 Testing search operations on small file...")
        search_results = await self._run_search_tests(file_id, "SMALL FILE")
        
        return {
            'file_id': file_id,
            'load_result': load_result,
            'search_results': search_results,
            'file_size_mb': file_size
        }

    async def test_large_file(self):
        """Test with 1M line file"""
        print("\n" + "="*80)
        print("📊 LARGE FILE PERFORMANCE TEST (1M LINES)")
        print("="*80)
        
        large_file = "syslog1M.log"
        
        if not os.path.exists(large_file):
            print(f"❌ Large test file not found: {large_file}")
            print("   Please ensure syslog1M.log exists in the current directory")
            return None
        
        file_size = os.path.getsize(large_file) / (1024 * 1024)
        print(f"📁 Testing large file: {large_file}")
        print(f"📏 File size: {file_size:.2f} MB")
        
        # Load the large file
        load_result = await self.load_file(os.path.abspath(large_file), "left", {"encoding": "utf-8"})
        
        if not load_result or 'fileId' not in load_result:
            print("❌ Failed to load large file")
            return None
        
        file_id = load_result['fileId']
        
        # Test search operations on large file
        print(f"🔍 Testing search operations on large file...")
        search_results = await self._run_search_tests(file_id, "LARGE FILE")
        
        return {
            'file_id': file_id,
            'load_result': load_result,
            'search_results': search_results,
            'file_size_mb': file_size
        }

    async def _run_search_tests(self, file_id: str, test_name: str):
        """Run a comprehensive set of search tests"""
        
        # Define search scenarios
        search_scenarios = [
            {
                "name": "Simple Text Search",
                "description": "Find 'systemd' entries",
                "filters": [{
                    "id": "systemd_filter",
                    "type": "text",
                    "operation": "include",
                    "enabled": True,
                    "parameters": {
                        "text": "systemd",
                        "caseSensitive": False,
                        "wholeWord": False
                    }
                }]
            },
            {
                "name": "Word Boundary Search",
                "description": "Find whole word 'kernel'",
                "filters": [{
                    "id": "kernel_filter",
                    "type": "text",
                    "operation": "include",
                    "enabled": True,
                    "parameters": {
                        "text": "kernel",
                        "caseSensitive": False,
                        "wholeWord": True
                    }
                }]
            },
            {
                "name": "Simple Regex",
                "description": "Find USB references",
                "filters": [{
                    "id": "usb_filter",
                    "type": "regex",
                    "operation": "include",
                    "enabled": True,
                    "parameters": {
                        "pattern": r"usb|USB",
                        "flags": ""
                    }
                }]
            },
            {
                "name": "Complex Regex",
                "description": "Find network terms",
                "filters": [{
                    "id": "network_filter",
                    "type": "regex",
                    "operation": "include",
                    "enabled": True,
                    "parameters": {
                        "pattern": r"(interface|device|network|eth|wlan)",
                        "flags": "i"
                    }
                }]
            },
            {
                "name": "Error Pattern",
                "description": "Find error conditions",
                "filters": [{
                    "id": "error_filter",
                    "type": "regex",
                    "operation": "include",
                    "enabled": True,
                    "parameters": {
                        "pattern": r"(error|fail|unable|invalid|not found)",
                        "flags": "i"
                    }
                }]
            }
        ]
        
        results = []
        
        for i, scenario in enumerate(search_scenarios, 1):
            print(f"   Search {i}: {scenario['name']}")
            
            search_start = time.time()
            try:
                search_result = await self.apply_filters_with_debug(
                    file_id, 
                    scenario['filters'], 
                    options={"maxResults": 10000}
                )
                search_time = time.time() - search_start
                
                # Fix: Check for proper success conditions
                if search_result and (
                    (search_result.get("type") == "filter_result" and search_result.get("success", False)) or
                    (search_result.get("success", False) and "content" in search_result)
                ):
                    content = search_result["content"]
                    matches = len(content['lines'])
                    
                    results.append({
                        'name': scenario['name'],
                        'success': True,
                        'matches': matches,
                        'search_time': search_time,
                        'has_more': content.get('hasMore', False),
                        'total_lines': content.get('totalLines', 0)
                    })
                    
                    print(f"      ✅ {matches:,} matches in {search_time:.3f}s")
                else:
                    error_msg = "No valid response received"
                    if search_result and search_result.get("type") == "error":
                        error_msg = search_result.get("message", "Unknown error")
                    
                    results.append({
                        'name': scenario['name'],
                        'success': False,
                        'search_time': search_time,
                        'error': error_msg
                    })
                    print(f"      ❌ Failed in {search_time:.3f}s")
                    
            except Exception as e:
                results.append({
                    'name': scenario['name'],
                    'success': False,
                    'error': str(e)
                })
                print(f"   ❌ Exception during search: {e}")
        
        return results

    def _generate_comparison_report(self, small_results, large_results):
        """Generate a detailed comparison report"""
        print("\n" + "="*80)
        print("📊 SMALL vs LARGE FILE COMPARISON REPORT")
        print("="*80)
        
        # File loading comparison
        print("📁 FILE LOADING COMPARISON:")
        if small_results and large_results:
            small_load = small_results['load_result']
            large_load = large_results['load_result']
            
            small_lines = small_load.get('metadata', {}).get('lineCount', 0)
            large_lines = large_load.get('metadata', {}).get('lineCount', 0)
            
            print(f"   Small file: {small_lines:,} lines ({small_results['file_size_mb']:.2f} MB)")
            print(f"   Large file: {large_lines:,} lines ({large_results['file_size_mb']:.2f} MB)")
            print(f"   Size ratio: {large_lines/small_lines:.1f}x larger" if small_lines > 0 else "")
        
        # Search operation comparison
        print(f"\n🔍 SEARCH OPERATION COMPARISON:")
        
        if small_results and large_results:
            small_searches = small_results['search_results']
            large_searches = large_results['search_results']
            
            # Success rate comparison
            small_success = len([s for s in small_searches if s['success']])
            large_success = len([s for s in large_searches if s['success']])
            
            print(f"   Small file success rate: {small_success}/{len(small_searches)} ({small_success/len(small_searches)*100:.1f}%)")
            print(f"   Large file success rate: {large_success}/{len(large_searches)} ({large_success/len(large_searches)*100:.1f}%)")
            
            # Detailed search comparison
            print(f"\n📋 DETAILED SEARCH RESULTS:")
            print(f"   {'Search Name':<20} | {'Small File':<12} | {'Large File':<12} | {'Status'}")
            print(f"   {'-'*75}")
            
            for i, (small, large) in enumerate(zip(small_searches, large_searches)):
                small_status = "✅ Success" if small['success'] else "❌ Failed"
                large_status = "✅ Success" if large['success'] else "❌ Failed"
                
                small_info = f"{small.get('matches', 0):,} matches" if small['success'] else "Failed"
                large_info = f"{large.get('matches', 0):,} matches" if large['success'] else "Failed"
                
                # Overall status
                if small['success'] and large['success']:
                    overall = "✅ Both OK"
                elif small['success'] and not large['success']:
                    overall = "⚠️  Large failed"
                elif not small['success'] and large['success']:
                    overall = "⚠️  Small failed"
                else:
                    overall = "❌ Both failed"
                
                print(f"   {small['name']:<20} | {small_info:<12} | {large_info:<12} | {overall}")
        
        # Analysis and recommendations
        print(f"\n💡 ANALYSIS AND RECOMMENDATIONS:")
        
        recommendations = []
        
        if small_results and large_results:
            small_success_rate = len([s for s in small_results['search_results'] if s['success']]) / len(small_results['search_results'])
            large_success_rate = len([s for s in large_results['search_results'] if s['success']]) / len(large_results['search_results'])
            
            if small_success_rate > 0.8 and large_success_rate > 0.8:
                recommendations.append("✅ Both file sizes handle searches well")
            elif small_success_rate > 0.8 and large_success_rate <= 0.8:
                recommendations.append("⚠️  Large files showing degraded search performance")
                recommendations.append("💡 Consider implementing search result pagination or indexing")
            elif small_success_rate <= 0.8:
                recommendations.append("❌ Fundamental search issues detected - check basic functionality")
            
            # Check for specific failure patterns
            large_failed = [s for s in large_results['search_results'] if not s['success']]
            if large_failed:
                recommendations.append(f"🔍 Failed searches on large file: {', '.join(s['name'] for s in large_failed)}")
                
                # Look for common error patterns
                regex_failures = [s for s in large_failed if 'regex' in s['name'].lower()]
                if regex_failures:
                    recommendations.append("⚠️  Regex searches failing on large files - may need optimization")
        
        if not recommendations:
            recommendations.append("🎉 No performance degradation detected between file sizes!")
        
        for i, rec in enumerate(recommendations, 1):
            print(f"   {i}. {rec}")
        
        print("\n" + "="*80)

    async def run_comprehensive_test(self):
        """Run the complete test suite"""
        print("🚀 Starting Comprehensive Large File Performance Test")
        print("This test will help identify if performance issues are size-related")
        print("and provide detailed debugging information for failed operations.")
        
        input("\nPress Enter to begin testing...")
        
        total_start = time.time()
        
        # Test 1: Small file baseline
        small_results = await self.test_small_file()
        
        # Test 2: Large file performance  
        large_results = await self.test_large_file()
        
        # Generate comparison report
        total_time = time.time() - total_start
        print(f"\n⏱️  Total test time: {total_time:.2f} seconds")
        
        self._generate_comparison_report(small_results, large_results)
        
        return small_results, large_results


async def main():
    """Main function"""
    print("🔬 Large File Performance Tester")
    print("This program will test your WebSocket backend with both small and large files,")
    print("providing detailed JSON debugging information for troubleshooting.")
    
    # Check for required files
    files_to_check = ["syslog_trunc_jun14_orig.log", "syslog1M.log"]
    missing_files = [f for f in files_to_check if not os.path.exists(f)]
    
    if missing_files:
        print(f"\n⚠️  Missing required files: {', '.join(missing_files)}")
        print("   Please ensure these files are in the current directory:")
        for f in missing_files:
            print(f"   - {f}")
        return
    
    tester = LargeFilePerformanceTester()
    
    # Connect to WebSocket server
    if not await tester.connect():
        print("\n❌ Failed to connect to WebSocket server. Please:")
        print("   1. Start the server: python main.py")
        print("   2. Make sure it's running on ws://localhost:8181/api/ws")
        print("   3. Try again")
        return
    
    try:
        await tester.run_comprehensive_test()
    finally:
        await tester.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
