from django.core.management.base import BaseCommand
from pos_app.models import *


class Command(BaseCommand):
    help = 'Check current notification status'

    def handle(self, *args, **options):
        self.stdout.write('Checking notification system status...')
        
        # Check total notifications
        total_notifications = Notification.objects.count()
        unread_notifications = Notification.objects.filter(is_read=False).count()
        
        self.stdout.write(f'\nTotal notifications: {total_notifications}')
        self.stdout.write(f'Unread notifications: {unread_notifications}')
        
        # Check by type
        self.stdout.write('\nNotifications by type:')
        for notif_type, display_name in Notification.TYPE_CHOICES:
            count = Notification.objects.filter(notification_type=notif_type).count()
            self.stdout.write(f'- {display_name}: {count}')
        
        # Show recent notifications
        self.stdout.write('\nRecent notifications (last 10):')
        recent = Notification.objects.all().order_by('-timestamp')[:10]
        
        for notif in recent:
            status = 'READ' if notif.is_read else 'UNREAD'
            self.stdout.write(f'- [{status}] {notif.notification_type}: {notif.message[:50]}... ({notif.timestamp})')
        
        # Check products with low stock
        self.stdout.write('\nProducts with low stock:')
        low_stock_products = Product.objects.filter(stock_quantity__lte=F('low_stock_threshold'))
        
        for product in low_stock_products:
            self.stdout.write(f'- {product.name}: {product.stock_quantity} units (threshold: {product.low_stock_threshold})')
        
        # Check recent transactions
        self.stdout.write('\nRecent transactions (last 5):')
        recent_transactions = Transaction.objects.all().order_by('-timestamp')[:5]
        
        for trans in recent_transactions:
            self.stdout.write(f'- Transaction {trans.id}: {trans.status} - ${trans.total_amount} ({trans.timestamp})')
        
        # Check recent customers and resellers
        self.stdout.write(f'\nRecent customers: {Customer.objects.count()}')
        self.stdout.write(f'Recent resellers: {Reseller.objects.count()}')
        
        self.stdout.write('\nCheck completed!')