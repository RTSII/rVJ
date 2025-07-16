#!/usr/bin/env python3
"""
Backend API Testing Script
Tests the FastAPI backend endpoints to ensure they're working correctly.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

def test_root_endpoint(base_url):
    """Test GET /api/ - root endpoint"""
    print("\n=== Testing GET /api/ (Root Endpoint) ===")
    try:
        url = f"{base_url}/api/"
        response = requests.get(url, timeout=30)
        
        print(f"URL: {url}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Root endpoint working correctly")
                return True
            else:
                print("❌ Root endpoint returned unexpected response")
                return False
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Root endpoint test failed: {e}")
        return False

def test_create_status_check(base_url):
    """Test POST /api/status - create status check"""
    print("\n=== Testing POST /api/status (Create Status Check) ===")
    try:
        url = f"{base_url}/api/status"
        
        # Use realistic test data
        test_data = {
            "client_name": "video_editor_client"
        }
        
        response = requests.post(
            url, 
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"URL: {url}")
        print(f"Request Data: {json.dumps(test_data, indent=2)}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "client_name", "timestamp"]
            
            if all(field in data for field in required_fields):
                if data["client_name"] == test_data["client_name"]:
                    print("✅ Create status check working correctly")
                    return True, data["id"]
                else:
                    print("❌ Create status check returned wrong client_name")
                    return False, None
            else:
                print(f"❌ Create status check missing required fields: {required_fields}")
                return False, None
        else:
            print(f"❌ Create status check failed with status {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ Create status check test failed: {e}")
        return False, None

def test_get_status_checks(base_url):
    """Test GET /api/status - get all status checks"""
    print("\n=== Testing GET /api/status (Get All Status Checks) ===")
    try:
        url = f"{base_url}/api/status"
        response = requests.get(url, timeout=10)
        
        print(f"URL: {url}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"✅ Get status checks working correctly (returned {len(data)} items)")
                return True
            else:
                print("❌ Get status checks should return a list")
                return False
        else:
            print(f"❌ Get status checks failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Get status checks test failed: {e}")
        return False

def main():
    print("🚀 Starting Backend API Tests")
    print("=" * 50)
    
    # Get backend URL
    backend_url = get_backend_url()
    if not backend_url:
        print("❌ Could not get backend URL from frontend/.env")
        sys.exit(1)
    
    print(f"Backend URL: {backend_url}")
    
    # Track test results
    results = {
        "root_endpoint": False,
        "create_status": False,
        "get_status": False
    }
    
    # Test 1: Root endpoint
    results["root_endpoint"] = test_root_endpoint(backend_url)
    
    # Test 2: Create status check
    create_success, created_id = test_create_status_check(backend_url)
    results["create_status"] = create_success
    
    # Test 3: Get status checks
    results["get_status"] = test_get_status_checks(backend_url)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print("⚠️  Some backend API tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())