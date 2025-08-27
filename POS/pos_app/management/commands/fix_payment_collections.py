from django.core.management.base import BaseCommand
from pos_app.models import PaymentCollection, Transaction, Customer, Reseller
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Fix PaymentCollection records with zero amounts'

    def handle(self, *args, **options):
        self.stdout.write('Fixing PaymentCollection records...')
        
        # Fix records with zero amounts
        zero_amount_collections = PaymentCollection.objects.filter(amount=0)
        fixed_count = 0
        
        for collection in zero_amount_collections:
            if collection.transaction and collection.transaction.total_amount > 0:
                # Update amount from transaction
                collection.amount = float(collection.transaction.total_amount)
                collection.save()
                fixed_count += 1
                self.stdout.write(f'Fixed collection {collection.id}: amount updated to ${collection.amount}')
            
            elif collection.customer and collection.customer.outstanding_balance > 0:
                # Update amount from customer outstanding balance
                collection.amount = float(collection.customer.outstanding_balance)
                collection.save()
                fixed_count += 1
                self.stdout.write(f'Fixed collection {collection.id}: amount updated to ${collection.amount}')
            
            elif collection.reseller and collection.reseller.current_balance > 0:
                # Update amount from reseller balance
                collection.amount = float(collection.reseller.current_balance)
                collection.save()
                fixed_count += 1
                self.stdout.write(f'Fixed collection {collection.id}: amount updated to ${collection.amount}')
        
        # Create missing collections for customers with outstanding balances
        customers_with_balance = Customer.objects.filter(outstanding_balance__gt=0)
        created_count = 0
        
        for customer in customers_with_balance:
            # Check if collection already exists
            existing = PaymentCollection.objects.filter(
                collection_type='CUSTOMER_DEBT',
                customer=customer,
                status='PENDING'
            ).exists()
            
            if not existing:
                from django.contrib.auth.models import User
                admin_user = User.objects.filter(is_superuser=True).first()
                
                if admin_user:
                    PaymentCollection.objects.create(
                        collection_type='CUSTOMER_DEBT',
                        customer=customer,
                        amount=float(customer.outstanding_balance),
                        due_date=datetime.now().date() + timedelta(days=customer.payment_terms_days),
                        description=f'Outstanding balance for: {customer.name}',
                        created_by=admin_user
                    )
                    created_count += 1
                    self.stdout.write(f'Created collection for customer {customer.name}: ${customer.outstanding_balance}')
        
        # Create missing collections for resellers with balances
        resellers_with_balance = Reseller.objects.filter(current_balance__gt=0)
        
        for reseller in resellers_with_balance:
            # Check if collection already exists
            existing = PaymentCollection.objects.filter(
                collection_type='RESELLER_PAYMENT',
                reseller=reseller,
                status='PENDING'
            ).exists()
            
            if not existing:
                from django.contrib.auth.models import User
                admin_user = User.objects.filter(is_superuser=True).first()
                
                if admin_user:
                    PaymentCollection.objects.create(
                        collection_type='RESELLER_PAYMENT',
                        reseller=reseller,
                        amount=float(reseller.current_balance),
                        due_date=datetime.now().date() + timedelta(days=reseller.payment_terms_days),
                        description=f'Commission payment to: {reseller.name}',
                        created_by=admin_user
                    )
                    created_count += 1
                    self.stdout.write(f'Created collection for reseller {reseller.name}: ${reseller.current_balance}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully fixed {fixed_count} records and created {created_count} new collections'
            )
        )