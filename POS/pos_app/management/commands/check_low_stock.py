from django.core.management.base import BaseCommand
from pos_app.models import Product, Notification
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Check all products for low stock and create notifications'

    def handle(self, *args, **options):
        products = Product.objects.filter(is_active=True)
        notifications_created = 0
        
        for product in products:
            if product.stock_quantity <= product.low_stock_threshold:
                # Check if notification already exists (within last 24 hours)
                yesterday = datetime.now() - timedelta(days=1)
                existing = Notification.objects.filter(
                    notification_type='LOW_STOCK',
                    related_product=product,
                    timestamp__gte=yesterday
                ).exists()
                
                if not existing:
                    Notification.objects.create(
                        message=f"⚠️ Low Stock Alert: {product.name} has only {product.stock_quantity} units remaining (reorder at {product.low_stock_threshold})",
                        notification_type='LOW_STOCK',
                        related_product=product
                    )
                    notifications_created += 1
                    self.stdout.write(f"Created low stock notification for {product.name}")
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {notifications_created} low stock notifications')
        )