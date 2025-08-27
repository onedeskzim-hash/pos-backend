#!/usr/bin/env python3
"""
Simple test script to verify Stock Movement API endpoints
Run this after starting the Django server to test the API
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_api_endpoint(endpoint, method="GET", data=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}/{endpoint}/"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        print(f"\n{method} {endpoint}/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Success")
            if response.json():
                print(f"Data count: {len(response.json()) if isinstance(response.json(), list) else 'Single object'}")
        else:
            print("❌ Failed")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error - Make sure Django server is running on {BASE_URL}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    print("Testing Stock Movement API Endpoints...")
    print("=" * 50)
    
    # Test basic endpoints
    endpoints_to_test = [
        "products",
        "stock-movements", 
        "stock-takes",
        "categories",
        "business-profile"
    ]
    
    for endpoint in endpoints_to_test:
        test_api_endpoint(endpoint)
    
    print("\n" + "=" * 50)
    print("Test completed!")
    print("\nIf you see connection errors, make sure to:")
    print("1. Start the Django server: python manage.py runserver")
    print("2. Install requirements: pip install -r requirements.txt")
    print("3. Run migrations: python manage.py migrate")

if __name__ == "__main__":
    main()