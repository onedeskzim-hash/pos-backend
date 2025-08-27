from django.core.management.base import BaseCommand
from pos_app.models import Notification, Product, Customer


class Command(BaseCommand):
    help = 'Create sample notifications for testing'

    def handle(self, *args, **options):
        # Create sample notifications
        notifications = [
            {
                'message': 'Low stock alert: Solar Panel 100W has only 3 units remaining',
                'notification_type': 'LOW_STOCK',
            },
            {
                'message': 'New customer John Doe has been added to the system',
                'notification_type': 'GENERAL',
            },
            {
                'message': 'Payment due: Customer ABC Corp has overdue payment of $500',
                'notification_type': 'PAYMENT_DUE',
            },
            {
                'message': 'Stock alert: Battery 12V Deep Cycle is out of stock',
                'notification_type': 'STOCK_ALERT',
            },
            {
                'message': 'System backup completed successfully',
                'notification_type': 'GENERAL',
            },
        ]

        for notif_data in notifications:
            Notification.objects.create(**notif_data)
            self.stdout.write(
                self.style.SUCCESS(f'Created notification: {notif_data["message"][:50]}...')
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(notifications)} sample notifications')
        )