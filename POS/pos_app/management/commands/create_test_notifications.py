from django.core.management.base import BaseCommand
from pos_app.models import *
from django.contrib.auth.models import User
from datetime import datetime


class Command(BaseCommand):
    help = 'Create test notifications for debugging'

    def handle(self, *args, **options):
        self.stdout.write('Creating test notifications...')
        
        # Create test notifications of each type
        
        # 1. General notification
        Notification.objects.create(
            message='Test general notification - System started',
            notification_type='GENERAL'
        )
        self.stdout.write('Created GENERAL notification')
        
        # 2. Low stock notification
        product = Product.objects.first()
        if product:
            Notification.objects.create(
                message=f'Test low stock alert: {product.name} has only 2 units remaining',
                notification_type='LOW_STOCK',
                related_product=product
            )
            self.stdout.write('Created LOW_STOCK notification')
        
        # 3. Payment due notification
        customer = Customer.objects.first()
        if customer:
            Notification.objects.create(
                message=f'Test payment overdue: {customer.name} has outstanding balance of $500',
                notification_type='PAYMENT_DUE',
                related_customer=customer
            )
            self.stdout.write('Created PAYMENT_DUE notification')
        
        # 4. Stock alert notification
        if product:
            Notification.objects.create(
                message=f'Test stock alert: Damage recorded for {product.name} - $100',
                notification_type='STOCK_ALERT',
                related_product=product
            )
            self.stdout.write('Created STOCK_ALERT notification')
        
        # 5. New customer notification
        if customer:
            Notification.objects.create(
                message=f'Test new customer added: {customer.name} ({customer.account_code})',
                notification_type='GENERAL',
                related_customer=customer
            )
            self.stdout.write('Created customer GENERAL notification')
        
        # 6. New reseller notification
        reseller = Reseller.objects.first()
        if reseller:
            Notification.objects.create(
                message=f'Test new reseller added: {reseller.name} ({reseller.account_code})',
                notification_type='GENERAL',
                related_reseller=reseller
            )
            self.stdout.write('Created reseller GENERAL notification')
        
        # 7. Transaction notification
        transaction = Transaction.objects.first()
        if transaction:
            customer_name = transaction.customer.name if transaction.customer else 'Walk-in Customer'
            Notification.objects.create(
                message=f'Test new sale: {transaction.product_names} sold to {customer_name} for ${transaction.total_amount} (ID: {transaction.id})',
                notification_type='GENERAL',
                related_customer=transaction.customer
            )
            self.stdout.write('Created transaction GENERAL notification')
        
        total_created = 7 if all([product, customer, reseller, transaction]) else 4
        self.stdout.write(f'\nCreated {total_created} test notifications successfully!')
        
        # Show current notification count
        total_notifications = Notification.objects.count()
        unread_notifications = Notification.objects.filter(is_read=False).count()
        self.stdout.write(f'Total notifications now: {total_notifications}')
        self.stdout.write(f'Unread notifications: {unread_notifications}')