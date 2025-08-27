from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from datetime import datetime, timedelta
from .models import *


@receiver(post_save, sender=Transaction)
def handle_transaction_stock_update(sender, instance, created, **kwargs):
    """Automatically update stock and create stock movements when transactions are created"""
    if created:
        # Handle single product transactions
        if instance.product:
            product = instance.product
            quantity = instance.quantity
            
            if instance.status in ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']:
                product.stock_quantity -= quantity
                product.save()
                
                print(f"Checking low stock (old system) for {product.name}: stock={product.stock_quantity}, threshold={product.low_stock_threshold}")
                if product.stock_quantity <= product.low_stock_threshold:
                    # Check if low stock notification already exists for this product (within last 24 hours)
                    from datetime import datetime, timedelta
                    yesterday = datetime.now() - timedelta(days=1)
                    existing_low_stock = Notification.objects.filter(
                        notification_type='LOW_STOCK',
                        related_product=product,
                        timestamp__gte=yesterday
                    ).exists()
                    
                    if not existing_low_stock:
                        print(f"Creating low stock notification (old system) for {product.name}")
                        Notification.objects.create(
                            message=f"Low stock alert: {product.name} has only {product.stock_quantity} units remaining (threshold: {product.low_stock_threshold})",
                            notification_type='LOW_STOCK',
                            related_product=product
                        )
                        print(f"Low stock notification (old system) created successfully")
                    else:
                        print(f"Low stock notification already exists for {product.name} within last 24 hours")


@receiver(post_save, sender=Payment)
def update_customer_balance(sender, instance, created, **kwargs):
    """Update customer outstanding balance when payment is made"""
    if created and instance.customer:
        customer = instance.customer
        customer.outstanding_balance -= instance.amount
        customer.save()


@receiver(post_save, sender=Payment)
def update_reseller_balance(sender, instance, created, **kwargs):
    """Update reseller balance when payment is made to them"""
    if created and instance.reseller:
        reseller = instance.reseller
        reseller.current_balance -= instance.amount
        reseller.save()


@receiver(post_save, sender=StockTake)
def handle_stock_take_adjustment(sender, instance, created, **kwargs):
    """Automatically adjust stock based on stock take results"""
    if created and instance.difference != 0:
        product = instance.product
        
        # Update product stock quantity
        product.stock_quantity = instance.counted_quantity
        product.save()
        
        # Create stock movement for the adjustment
        movement_type = 'ADJUSTMENT_IN' if instance.difference > 0 else 'ADJUSTMENT_OUT'
        StockMovement.objects.create(
            movement_type=movement_type,
            product=product,
            quantity=instance.difference,
            reference_doc_type='STOCK_TAKE',
            reference_doc_id=instance.id,
            performed_by=instance.performed_by,
            reason='COUNT_DIFFERENCE',
            notes=f"Stock take adjustment: {instance.difference} units"
        )


@receiver(pre_save, sender=Invoice)
def generate_invoice_number(sender, instance, **kwargs):
    """Generate automatic invoice number if not provided"""
    if not instance.invoice_number:
        from datetime import datetime
        year = datetime.now().year
        month = datetime.now().month
        
        # Get last invoice number for this month
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=f"INV-{year}{month:02d}"
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            last_num = int(last_invoice.invoice_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
            
        instance.invoice_number = f"INV-{year}{month:02d}-{new_num:04d}"


@receiver(pre_save, sender=Receipt)
def generate_receipt_number(sender, instance, **kwargs):
    """Generate automatic receipt number if not provided"""
    if not instance.receipt_number:
        from datetime import datetime
        
        today = datetime.now().date()
        date_str = today.strftime("%Y%m%d")
        
        # Get last receipt number for today
        last_receipt = Receipt.objects.filter(
            receipt_number__startswith=f"RCP-{date_str}"
        ).order_by('-receipt_number').first()
        
        if last_receipt:
            last_num = int(last_receipt.receipt_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
            
        instance.receipt_number = f"RCP-{date_str}-{new_num:04d}"


@receiver(post_save, sender=Loss)
def handle_loss_stock_adjustment(sender, instance, created, **kwargs):
    """Automatically adjust stock when loss is recorded"""
    if created and instance.product and instance.quantity > 0:
        product = instance.product
        
        # Deduct from stock
        product.stock_quantity -= instance.quantity
        product.save()
        
        # Create stock movement for the loss
        StockMovement.objects.create(
            movement_type='ADJUSTMENT_OUT',
            product=product,
            quantity=-instance.quantity,
            unit_cost=instance.unit_cost,
            reference_doc_type='LOSS',
            reference_doc_id=instance.id,
            performed_by=instance.recorded_by,
            reason=instance.loss_type,
            notes=f"Loss recorded: {instance.description}"
        )


@receiver(post_save, sender=Customer)
def create_customer_notification(sender, instance, created, **kwargs):
    """Create notification when new customer is added"""
    if created:
        print(f"Creating customer notification for: {instance.name}")
        Notification.objects.create(
            message=f"New customer added: {instance.name} ({instance.account_code})",
            notification_type='GENERAL',
            related_customer=instance
        )
        print(f"Customer notification created successfully")


@receiver(post_save, sender=Product)
def create_product_notification(sender, instance, created, **kwargs):
    """Create notification when new product is added"""
    if created:
        Notification.objects.create(
            message=f"New product added: {instance.name} ({instance.product_unique_code})",
            notification_type='GENERAL',
            related_product=instance
        )


# Disabled transaction notifications to prevent "Unknown Product" entries
# @receiver(post_save, sender=Transaction)
# def create_transaction_notification(sender, instance, created, **kwargs):
#     pass


@receiver(post_save, sender=Reseller)
def create_reseller_notification(sender, instance, created, **kwargs):
    """Create notification when new reseller is added"""
    if created:
        print(f"Creating reseller notification for: {instance.name}")
        Notification.objects.create(
            message=f"New reseller added: {instance.name} ({instance.account_code})",
            notification_type='GENERAL',
            related_reseller=instance
        )
        print(f"Reseller notification created successfully")


@receiver(post_save, sender=Payment)
def create_payment_notification(sender, instance, created, **kwargs):
    """Create notification when payment is received"""
    if created:
        if instance.customer:
            Notification.objects.create(
                message=f"Payment received: ${instance.amount} from {instance.customer.name} via {instance.payment_method}",
                notification_type='GENERAL',
                related_customer=instance.customer
            )
        elif instance.reseller:
            Notification.objects.create(
                message=f"Payment made: ${instance.amount} to {instance.reseller.name} via {instance.payment_method}",
                notification_type='GENERAL',
                related_reseller=instance.reseller
            )


@receiver(post_save, sender=Customer)
def check_payment_overdue(sender, instance, **kwargs):
    """Check for overdue payments when customer balance is updated"""
    if instance.outstanding_balance > 0:
        from datetime import datetime, timedelta
        overdue_date = instance.date_created + timedelta(days=instance.payment_terms_days)
        if datetime.now().date() > overdue_date.date():
            Notification.objects.create(
                message=f"Payment overdue: {instance.name} has outstanding balance of ${instance.outstanding_balance}",
                notification_type='PAYMENT_DUE',
                related_customer=instance
            )





@receiver(post_save, sender=Expense)
def create_expense_notification(sender, instance, created, **kwargs):
    """Create notification when new expense is recorded"""
    if created:
        Notification.objects.create(
            message=f"New expense recorded: {instance.description} - ${instance.amount}",
            notification_type='GENERAL'
        )


@receiver(post_save, sender=StockMovement)
def check_low_stock_after_movement(sender, instance, created, **kwargs):
    """Check for low stock after any stock movement"""
    if created and instance.movement_type in ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT']:
        product = instance.product
        print(f"Checking low stock after movement for {product.name}: stock={product.stock_quantity}, threshold={product.low_stock_threshold}")
        
        if product.stock_quantity <= product.low_stock_threshold:
            # Check if low stock notification already exists for this product (within last 24 hours)
            from datetime import datetime, timedelta
            yesterday = datetime.now() - timedelta(days=1)
            existing_low_stock = Notification.objects.filter(
                notification_type='LOW_STOCK',
                related_product=product,
                timestamp__gte=yesterday
            ).exists()
            
            if not existing_low_stock:
                print(f"Creating low stock notification after movement for {product.name}")
                Notification.objects.create(
                    message=f"Low stock alert: {product.name} has only {product.stock_quantity} units remaining (threshold: {product.low_stock_threshold})",
                    notification_type='LOW_STOCK',
                    related_product=product
                )
                print(f"Low stock notification after movement created successfully")


@receiver(post_save, sender=Transaction)
def create_payment_collection_record(sender, instance, created, **kwargs):
    """Create payment collection records for transactions that need follow-up"""
    if created and instance.status in ['PAID_TO_COLLECT', 'COLLECTED_TO_PAY'] and instance.total_amount > 0:
        from datetime import datetime, timedelta
        
        product_name = instance.product_names
        created_by_user = instance.sale_by or User.objects.filter(is_superuser=True).first()
        
        if instance.status == 'PAID_TO_COLLECT':
            PaymentCollection.objects.create(
                collection_type='ITEM_TO_COLLECT',
                customer=instance.customer,
                transaction=instance,
                amount=float(instance.total_amount),
                due_date=datetime.now().date() + timedelta(days=7),
                description=f"Item to collect: {product_name}",
                created_by=created_by_user
            )
        elif instance.status == 'COLLECTED_TO_PAY':
            PaymentCollection.objects.create(
                collection_type='CUSTOMER_DEBT',
                customer=instance.customer,
                transaction=instance,
                amount=float(instance.total_amount),
                due_date=datetime.now().date() + timedelta(days=30),
                description=f"Payment due for: {product_name}",
                created_by=created_by_user
            )


@receiver(post_save, sender=Transaction)
def handle_reseller_commission(sender, instance, created, **kwargs):
    """Handle reseller commission and balance updates"""
    if created and instance.reseller and instance.status in ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY'] and instance.total_amount > 0:
        from datetime import datetime, timedelta
        
        reseller = instance.reseller
        
        # Calculate commission based on reseller balance field
        commission_amount = float(instance.reseller_balance) if instance.reseller_balance else 0
        
        # Update reseller balance
        if commission_amount > 0:
            reseller.current_balance += commission_amount
            reseller.save()
            
            # Create payment collection for reseller commission
            PaymentCollection.objects.create(
                collection_type='RESELLER_PAYMENT',
                reseller=reseller,
                transaction=instance,
                amount=commission_amount,
                due_date=datetime.now().date() + timedelta(days=reseller.payment_terms_days),
                description=f"Commission for sale: {instance.product_names}",
                created_by=instance.sale_by or User.objects.filter(is_superuser=True).first()
            )


@receiver(post_save, sender=Invoice)
def create_invoice_payment_collection(sender, instance, created, **kwargs):
    """Create payment collection for pending invoices"""
    if created and instance.status == 'PENDING' and instance.customer:
        from datetime import datetime, timedelta
        
        due_date = instance.date_due.date() if instance.date_due else datetime.now().date() + timedelta(days=30)
        
        PaymentCollection.objects.create(
            collection_type='CUSTOMER_DEBT',
            customer=instance.customer,
            invoice=instance,
            amount=instance.total_amount,
            due_date=due_date,
            description=f"Invoice payment due: {instance.invoice_number}",
            created_by=instance.created_by or User.objects.filter(is_superuser=True).first()
        )


@receiver(post_save, sender=Customer)
def handle_customer_outstanding_balance(sender, instance, **kwargs):
    """Create payment collection for customer outstanding balance"""
    if instance.outstanding_balance > 0:
        from datetime import datetime, timedelta
        
        # Check if collection already exists for this customer's outstanding balance
        existing = PaymentCollection.objects.filter(
            collection_type='CUSTOMER_DEBT',
            customer=instance,
            description__contains='Outstanding balance',
            status='PENDING'
        ).exists()
        
        if not existing:
            created_by_user = User.objects.filter(is_superuser=True).first()
            if created_by_user:
                PaymentCollection.objects.create(
                    collection_type='CUSTOMER_DEBT',
                    customer=instance,
                    amount=float(instance.outstanding_balance),
                    due_date=datetime.now().date() + timedelta(days=instance.payment_terms_days),
                    description=f"Outstanding balance for: {instance.name}",
                    created_by=created_by_user
                )


@receiver(post_save, sender=Loss)
def create_loss_notification(sender, instance, created, **kwargs):
    """Create notification when loss is recorded"""
    if created:
        product_info = f" for {instance.product.name}" if instance.product else ""
        Notification.objects.create(
            message=f"Loss recorded: {instance.loss_type} - ${instance.total_loss_amount}{product_info}",
            notification_type='STOCK_ALERT',
            related_product=instance.product
        )