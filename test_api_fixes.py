#!/usr/bin/env python3
"""
Test script to verify API endpoints are working correctly
Run this after starting the Django server
"""

import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api'

# Test data for each endpoint
test_data = {
    'expenses': {
        'description': 'Test Expense',
        'expense_type': 'OPERATIONAL',
        'amount': 100.00,
        'notes': 'Test expense creation'
    },
    'stock-movements': {
        'movement_type': 'ADJUSTMENT_IN',
        'product': 1,  # Assuming product with ID 1 exists
        'quantity': 10,
        'unit_cost': 50.00,
        'reason': 'OTHER',
        'notes': 'Test stock movement'
    },
    'stock-takes': {
        'product': 1,  # Assuming product with ID 1 exists
        'counted_quantity': 15,
        'notes': 'Test stock take'
    },
    'transactions': {
        'status': 'RECEIVED',
        'total_amount': 200.00,
        'payment_method': 'CASH',
        'is_taxed': False,
        'notes': 'Test transaction',
        'items': [
            {
                'product': 1,
                'quantity': 2,
                'unit_price': 100.00
            }
        ]
    },
    'payment-collections': {
        'collection_type': 'CUSTOMER_DEBT',
        'customer': 1,  # Assuming customer with ID 1 exists
        'amount': 150.00,
        'due_date': '2025-01-31',
        'description': 'Test payment collection'
    },
    'invoices': {
        'customer': 1,  # Assuming customer with ID 1 exists
        'due_date': '2025-01-31',
        'notes': 'Test invoice',
        'items': [
            {
                'product': 1,
                'quantity': 1,
                'unit_price': 100.00
            }
        ]
    }
}

def test_endpoint(endpoint, data):
    """Test a single API endpoint"""
    url = f"{BASE_URL}/{endpoint}/"
    
    print(f"\n=== Testing {endpoint} ===")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        # Get auth token (you may need to adjust this based on your auth setup)
        headers = {
            'Content-Type': 'application/json',
            # Add your auth token here if needed
            # 'Authorization': 'Token your_token_here'
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("✅ SUCCESS: Created successfully")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        elif response.status_code == 400:
            print("❌ BAD REQUEST: Validation error")
            print(f"Error: {response.text}")
        elif response.status_code == 401:
            print("🔒 UNAUTHORIZED: Authentication required")
        elif response.status_code == 403:
            print("🚫 FORBIDDEN: Permission denied")
        else:
            print(f"⚠️  UNEXPECTED STATUS: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Make sure Django server is running on http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    print("🧪 Testing API Endpoints")
    print("=" * 50)
    
    # Test each endpoint
    for endpoint, data in test_data.items():
        test_endpoint(endpoint, data)
    
    print("\n" + "=" * 50)
    print("✅ Testing completed!")
    print("\nIf you see 401 UNAUTHORIZED errors, you need to:")
    print("1. Create a superuser: python manage.py createsuperuser")
    print("2. Get an auth token and add it to the headers")
    print("3. Or disable authentication temporarily for testing")

if __name__ == "__main__":
    main()