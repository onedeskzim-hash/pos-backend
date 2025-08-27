from django.core.management.base import BaseCommand
from pos_app.models import *
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Test notification system'

    def handle(self, *args, **options):
        self.stdout.write('Testing notification system...')
        
        # Test 1: Create a test customer
        self.stdout.write('\n1. Testing customer notification...')
        customer = Customer.objects.create(
            name='Test Customer for Notifications',
            phone_no='1234567890',
            email='test@example.com'
        )
        self.stdout.write(f'Created customer: {customer.name}')
        
        # Test 2: Create a test reseller
        self.stdout.write('\n2. Testing reseller notification...')
        reseller = Reseller.objects.create(
            name='Test Reseller for Notifications',
            phone_no='0987654321',
            email='reseller@example.com'
        )
        self.stdout.write(f'Created reseller: {reseller.name}')
        
        # Test 3: Create a test product with low stock threshold
        self.stdout.write('\n3. Testing product and low stock notification...')
        category = Category.objects.first()
        if not category:
            category = Category.objects.create(name='Test Category')
        
        product = Product.objects.create(
            name='Test Product for Low Stock',
            category=category,
            default_sale_price=100.00,
            stock_quantity=3,
            low_stock_threshold=5
        )
        self.stdout.write(f'Created product: {product.name} with stock {product.stock_quantity}, threshold {product.low_stock_threshold}')
        
        # Test 4: Create a transaction to trigger low stock
        self.stdout.write('\n4. Testing transaction notification...')
        user = User.objects.first()
        if not user:
            user = User.objects.create_user('testuser', 'test@test.com', 'password')
        
        transaction = Transaction.objects.create(
            status='SOLD',
            total_amount=100.00,
            sale_by=user,
            customer=customer
        )
        
        # Create transaction item
        TransactionItem.objects.create(
            transaction=transaction,
            product=product,
            quantity=1,
            unit_price=100.00,
            total_price=100.00
        )
        
        self.stdout.write(f'Created transaction: {transaction.id}')
        
        # Check notifications
        self.stdout.write('\n5. Checking created notifications...')
        notifications = Notification.objects.all().order_by('-timestamp')[:10]
        
        for notif in notifications:
            self.stdout.write(f'- {notif.notification_type}: {notif.message} (Created: {notif.timestamp})')
        
        self.stdout.write(f'\nTotal notifications: {Notification.objects.count()}')
        self.stdout.write('Test completed!')