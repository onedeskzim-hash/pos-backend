from django.core.management.base import BaseCommand
from pos_app.models import *
from django.contrib.auth.models import User
from datetime import datetime


class Command(BaseCommand):
    help = 'Fix and test notification system'

    def handle(self, *args, **options):
        self.stdout.write('Fixing notification system...')
        
        # 1. Clear old notifications for testing
        old_count = Notification.objects.count()
        self.stdout.write(f'Current notifications: {old_count}')
        
        # 2. Create test data if needed
        user = User.objects.first()
        if not user:
            user = User.objects.create_user('testuser', 'test@test.com', 'password')
            self.stdout.write('Created test user')
        
        # 3. Test customer notification
        self.stdout.write('\n--- Testing Customer Notification ---')
        customer = Customer.objects.create(
            name=f'Test Customer {datetime.now().strftime("%H%M%S")}',
            phone_no='1234567890',
            email='test@example.com'
        )
        self.stdout.write(f'Created customer: {customer.name}')
        
        # 4. Test reseller notification
        self.stdout.write('\n--- Testing Reseller Notification ---')
        reseller = Reseller.objects.create(
            name=f'Test Reseller {datetime.now().strftime("%H%M%S")}',
            phone_no='0987654321',
            email='reseller@example.com'
        )
        self.stdout.write(f'Created reseller: {reseller.name}')
        
        # 5. Test product and low stock
        self.stdout.write('\n--- Testing Product and Low Stock ---')
        category = Category.objects.first()
        if not category:
            category = Category.objects.create(name='Test Category')
        
        product = Product.objects.create(
            name=f'Test Product {datetime.now().strftime("%H%M%S")}',
            category=category,
            default_sale_price=100.00,
            stock_quantity=2,  # Below threshold
            low_stock_threshold=5
        )
        self.stdout.write(f'Created product: {product.name} (stock: {product.stock_quantity}, threshold: {product.low_stock_threshold})')
        
        # 6. Test transaction notification
        self.stdout.write('\n--- Testing Transaction Notification ---')
        transaction = Transaction.objects.create(
            status='SOLD',
            total_amount=100.00,
            sale_by=user,
            customer=customer
        )
        
        # Create transaction item to trigger stock update
        TransactionItem.objects.create(
            transaction=transaction,
            product=product,
            quantity=1,
            unit_price=100.00,
            total_price=100.00
        )
        self.stdout.write(f'Created transaction: {transaction.id}')
        
        # 7. Manually create notifications to test display
        self.stdout.write('\n--- Creating Manual Test Notifications ---')
        
        # Low stock notification
        Notification.objects.create(
            message=f'Manual low stock alert: {product.name} has only {product.stock_quantity} units remaining',
            notification_type='LOW_STOCK',
            related_product=product
        )
        
        # General notification
        Notification.objects.create(
            message=f'Manual test: New customer {customer.name} added to system',
            notification_type='GENERAL',
            related_customer=customer
        )
        
        # Payment due notification
        Notification.objects.create(
            message=f'Manual test: Payment overdue for {customer.name}',
            notification_type='PAYMENT_DUE',
            related_customer=customer
        )
        
        # Stock alert notification
        Notification.objects.create(
            message=f'Manual test: Stock alert for {product.name}',
            notification_type='STOCK_ALERT',
            related_product=product
        )
        
        self.stdout.write('Created 4 manual test notifications')
        
        # 8. Check final results
        self.stdout.write('\n--- Final Results ---')
        final_count = Notification.objects.count()
        new_notifications = final_count - old_count
        
        self.stdout.write(f'Total notifications now: {final_count}')
        self.stdout.write(f'New notifications created: {new_notifications}')
        
        # Show recent notifications by type
        for notif_type, display_name in Notification.TYPE_CHOICES:
            count = Notification.objects.filter(notification_type=notif_type).count()
            self.stdout.write(f'- {display_name}: {count}')
        
        # Show latest notifications
        self.stdout.write('\nLatest 5 notifications:')
        latest = Notification.objects.all().order_by('-timestamp')[:5]
        for notif in latest:
            self.stdout.write(f'- [{notif.notification_type}] {notif.message[:60]}...')
        
        self.stdout.write('\n✅ Notification system test completed!')
        self.stdout.write('Check the frontend Notifications tab to see if they appear.')