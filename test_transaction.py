#!/usr/bin/env python3
import requests
import json

# Test authentication and transaction creation
BASE_URL = "http://127.0.0.1:8000/api"

def test_login():
    """Test login and get token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
    print(f"Login Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Login Success: {data['success']}")
        print(f"Token: {data['token'][:20]}...")
        print(f"User: {data['user']['username']}")
        return data['token']
    else:
        print(f"Login Failed: {response.text}")
        return None

def test_transaction_creation(token):
    """Test creating a transaction with token"""
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }
    
    # First, get a product to use
    products_response = requests.get(f"{BASE_URL}/products/", headers=headers)
    if products_response.status_code != 200:
        print(f"Failed to get products: {products_response.status_code}")
        return
    
    products = products_response.json()
    if not products.get('results'):
        print("No products found")
        return
    
    product = products['results'][0]
    print(f"Using product: {product['name']} (ID: {product['id']})")
    
    # Create transaction
    transaction_data = {
        "product": product['id'],
        "quantity": 1,
        "status": "SOLD",
        "dealership_price": 100.00,
        "sale_price": 150.00,
        "is_taxed": False,
        "notes": "Test transaction"
    }
    
    response = requests.post(f"{BASE_URL}/transactions/", json=transaction_data, headers=headers)
    print(f"Transaction Creation Status: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Transaction Created Successfully: ID {data['id']}")
        print(f"Total Amount: ${data['total_amount']}")
    else:
        print(f"Transaction Creation Failed: {response.text}")

if __name__ == "__main__":
    print("Testing POS System Authentication and Transaction Creation")
    print("=" * 60)
    
    # Test login
    token = test_login()
    
    if token:
        print("\n" + "=" * 60)
        # Test transaction creation
        test_transaction_creation(token)
    else:
        print("Cannot test transaction creation without valid token")