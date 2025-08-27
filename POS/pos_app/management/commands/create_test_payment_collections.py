from django.core.management.base import BaseCommand
from pos_app.models import *
from django.contrib.auth.models import User
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Create test payment collection records'

    def handle(self, *args, **options):
        self.stdout.write('Creating test payment collection records...')
        
        user = User.objects.first()
        if not user:
            user = User.objects.create_user('testuser', 'test@test.com', 'password')
        
        # Create test customer debt
        customer = Customer.objects.first()
        if customer:
            PaymentCollection.objects.create(
                collection_type='CUSTOMER_DEBT',
                customer=customer,
                amount=500.00,
                due_date=datetime.now().date() + timedelta(days=30),
                description=f'Outstanding payment for {customer.name}',
                created_by=user
            )
            self.stdout.write('Created customer debt record')
        
        # Create test item to collect
        if customer:
            PaymentCollection.objects.create(
                collection_type='ITEM_TO_COLLECT',
                customer=customer,
                amount=250.00,
                due_date=datetime.now().date() + timedelta(days=7),
                description=f'Items ready for collection by {customer.name}',
                created_by=user
            )
            self.stdout.write('Created item to collect record')
        
        # Create test reseller payment
        reseller = Reseller.objects.first()
        if reseller:
            PaymentCollection.objects.create(
                collection_type='RESELLER_PAYMENT',
                reseller=reseller,
                amount=300.00,
                due_date=datetime.now().date() + timedelta(days=15),
                description=f'Commission payment due to {reseller.name}',
                created_by=user
            )
            self.stdout.write('Created reseller payment record')
        
        total = PaymentCollection.objects.count()
        self.stdout.write(f'Total payment collection records: {total}')
        self.stdout.write('Test data created successfully!')