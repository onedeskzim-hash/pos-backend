# This file contains validation fixes for the API endpoints
# These fixes ensure that all required fields have proper defaults and validation

from rest_framework import serializers
from .models import *

def validate_expense_data(data):
    """Validate expense data and provide defaults"""
    # Ensure category exists
    if 'category' not in data or not data['category']:
        category = ExpenseCategory.objects.first()
        if not category:
            category = ExpenseCategory.objects.create(
                name='General',
                description='Default expense category'
            )
        data['category'] = category.id
    
    # Ensure required fields
    if 'expense_type' not in data or not data['expense_type']:
        data['expense_type'] = 'OTHER'
    
    return data

def validate_stock_movement_data(data):
    """Validate stock movement data and provide defaults"""
    if 'unit_cost' not in data or data['unit_cost'] is None:
        data['unit_cost'] = 0
    if 'reason' not in data or not data['reason']:
        data['reason'] = 'OTHER'
    if 'movement_type' not in data or not data['movement_type']:
        data['movement_type'] = 'ADJUSTMENT_IN'
    
    return data

def validate_stock_take_data(data):
    """Validate stock take data and provide defaults"""
    # Auto-populate system_quantity from product if not provided
    if 'product' in data and ('system_quantity' not in data or data['system_quantity'] is None):
        try:
            product_id = data['product']
            if isinstance(product_id, dict):
                product_id = product_id.get('id')
            product = Product.objects.get(id=product_id)
            data['system_quantity'] = product.stock_quantity
        except Product.DoesNotExist:
            data['system_quantity'] = 0
    
    return data

def validate_transaction_data(data):
    """Validate transaction data and provide defaults"""
    if 'status' not in data or not data['status']:
        data['status'] = 'RECEIVED'
    if 'total_amount' not in data or data['total_amount'] is None:
        data['total_amount'] = 0
    if 'tax_amount' not in data or data['tax_amount'] is None:
        data['tax_amount'] = 0
    if 'reseller_balance' not in data or data['reseller_balance'] is None:
        data['reseller_balance'] = 0
    if 'payment_method' not in data or not data['payment_method']:
        data['payment_method'] = 'CASH'
    if 'is_taxed' not in data:
        data['is_taxed'] = False
    
    return data

def validate_payment_collection_data(data):
    """Validate payment collection data and provide defaults"""
    collection_type = data.get('collection_type')
    
    # Validate customer/reseller based on collection type
    if collection_type == 'RESELLER_PAYMENT':
        if not data.get('reseller'):
            raise serializers.ValidationError('Reseller is required for reseller payments')
    elif collection_type in ['CUSTOMER_DEBT', 'ITEM_TO_COLLECT']:
        if not data.get('customer'):
            raise serializers.ValidationError('Customer is required for customer debts and collections')
    
    # Ensure required fields have defaults
    if 'status' not in data or not data['status']:
        data['status'] = 'PENDING'
    
    return data

def validate_invoice_data(data):
    """Validate invoice data and provide defaults"""
    if 'status' not in data or not data['status']:
        data['status'] = 'DRAFT'
    if 'subtotal' not in data or data['subtotal'] is None:
        data['subtotal'] = 0
    if 'tax_amount' not in data or data['tax_amount'] is None:
        data['tax_amount'] = 0
    if 'total_amount' not in data or data['total_amount'] is None:
        data['total_amount'] = 0
    
    return data