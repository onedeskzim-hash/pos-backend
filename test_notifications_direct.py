import os
import sys
import django

# Add the POS directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'POS'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'POS.settings')
django.setup()

from pos_app.models import *
from django.contrib.auth.models import User

def test_notifications():
    print("Testing notification system...")
    
    # Check current notifications
    total_notifications = Notification.objects.count()
    print(f"Current total notifications: {total_notifications}")
    
    # Create test notifications
    print("\nCreating test notifications...")
    
    # 1. General notification
    Notification.objects.create(
        message='Test general notification - System test',
        notification_type='GENERAL'
    )
    print("✓ Created GENERAL notification")
    
    # 2. Low stock notification
    product = Product.objects.first()
    if product:
        Notification.objects.create(
            message=f'Test low stock alert: {product.name} has only 2 units remaining',
            notification_type='LOW_STOCK',
            related_product=product
        )
        print("✓ Created LOW_STOCK notification")
    
    # 3. Payment due notification
    customer = Customer.objects.first()
    if customer:
        Notification.objects.create(
            message=f'Test payment overdue: {customer.name} has outstanding balance of $500',
            notification_type='PAYMENT_DUE',
            related_customer=customer
        )
        print("✓ Created PAYMENT_DUE notification")
    
    # 4. Stock alert notification
    if product:
        Notification.objects.create(
            message=f'Test stock alert: Damage recorded for {product.name} - $100',
            notification_type='STOCK_ALERT',
            related_product=product
        )
        print("✓ Created STOCK_ALERT notification")
    
    # Check final count
    final_count = Notification.objects.count()
    print(f"\nFinal notification count: {final_count}")
    print(f"New notifications created: {final_count - total_notifications}")
    
    # Show recent notifications
    print("\nRecent notifications:")
    recent = Notification.objects.all().order_by('-timestamp')[:5]
    for notif in recent:
        print(f"- {notif.notification_type}: {notif.message[:50]}...")
    
    print("\nTest completed!")

if __name__ == "__main__":
    test_notifications()