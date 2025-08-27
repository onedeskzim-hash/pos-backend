from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from django.db.models import F


class BusinessProfile(models.Model):
    business_name = models.CharField(max_length=200, default='My Business')
    legal_name = models.CharField(max_length=200, default='My Business Legal Name')
    tax_number = models.CharField(max_length=50, blank=True)
    address = models.TextField(default='No address provided')
    phone = models.CharField(max_length=20, default='000-000-0000')
    email = models.EmailField(default='admin@business.com')
    logo = models.ImageField(upload_to='business/', blank=True)
    invoice_footer_text = models.TextField(blank=True)
    receipt_footer_text = models.TextField(blank=True)
    default_currency = models.CharField(max_length=3, default='USD')
    timezone = models.CharField(max_length=50, default='UTC')
    zimra_enabled = models.BooleanField(default=False)
    zimra_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=15.00)
    zimra_api_url = models.URLField(default='https://api.zimra.co.zw/v1/')
    zimra_client_id = models.CharField(max_length=100, blank=True)
    zimra_client_secret = models.CharField(max_length=200, blank=True)
    zimra_device_id = models.CharField(max_length=50, blank=True)
    zimra_branch_code = models.CharField(max_length=20, blank=True)
    zimra_terminal_id = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.business_name


class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('MANAGER', 'Manager'),
        ('CASHIER', 'Cashier'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    display_name = models.CharField(max_length=100, default='Staff Member')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CASHIER')
    can_override_price = models.BooleanField(default=False)
    can_discount = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.display_name} ({self.role})"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, default='General')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=200, default='Supplier Name')
    contact_info = models.CharField(max_length=200, default='No contact info')
    address = models.TextField(blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    TAX_CHOICES = [
        ('STANDARD_15', 'Standard 15%'),
        ('ZERO_RATED', 'Zero Rated'),
        ('EXEMPT', 'Exempt'),
    ]

    name = models.CharField(max_length=200, default='Product Name')
    product_unique_code = models.CharField(max_length=50, unique=True, blank=True, null=True, default='')
    barcode = models.CharField(max_length=50, unique=True, blank=True, null=True, default='')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    unit = models.CharField(max_length=20, default='unit')
    cost_price_avg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    default_sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_group = models.CharField(max_length=12, choices=TAX_CHOICES, default='STANDARD_15')
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    is_serial_tracked = models.BooleanField(default=False)
    warranty_months = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.product_unique_code})"

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.low_stock_threshold
    
    def save(self, *args, **kwargs):
        if not self.product_unique_code:
            self.product_unique_code = self.generate_product_code()
        super().save(*args, **kwargs)
    
    def generate_product_code(self):
        """Generate automatic product unique code"""
        from datetime import datetime
        
        # Get category prefix (first 3 letters)
        category_prefix = self.category.name[:3].upper() if self.category else 'PRD'
        
        # Get current year
        year = datetime.now().year
        
        # Count existing products in this category
        existing_count = Product.objects.filter(category=self.category).count() + 1
        
        # Generate code: CATEGORY-YEAR-NUMBER
        return f"{category_prefix}-{year}-{existing_count:04d}"


class Customer(models.Model):
    name = models.CharField(max_length=200, default='Customer Name')
    phone_no = models.CharField(max_length=20, default='000-000-0000')
    contact_info = models.CharField(max_length=200, default='No contact info')
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    national_id_no = models.CharField(max_length=20, blank=True)
    account_code = models.CharField(max_length=50, unique=True, blank=True, null=True, default='')
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_terms_days = models.IntegerField(default=30)
    outstanding_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    date_created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_created']

    def save(self, *args, **kwargs):
        if not self.account_code:
            self.account_code = self.generate_account_code()
        super().save(*args, **kwargs)
    
    def generate_account_code(self):
        """Generate automatic customer account code"""
        from datetime import datetime
        
        # Get current year
        year = datetime.now().year
        
        # Count existing customers
        existing_count = Customer.objects.count() + 1
        
        # Generate code: CUST-YEAR-NUMBER
        return f"CUST-{year}-{existing_count:04d}"

    def __str__(self):
        return self.name


class Reseller(models.Model):
    SETTLEMENT_CHOICES = [
        ('PRICE_DIFFERENCE', 'Price Difference'),
        ('PERCENT_COMMISSION', 'Percentage Commission'),
    ]

    name = models.CharField(max_length=200, default='Reseller Name')
    company_name = models.CharField(max_length=200, blank=True)
    phone_no = models.CharField(max_length=20, default='000-000-0000')
    email = models.EmailField(blank=True)
    national_id_no = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    account_code = models.CharField(max_length=50, unique=True, blank=True, null=True, default='')
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    settlement_mode = models.CharField(max_length=20, choices=SETTLEMENT_CHOICES, default='PRICE_DIFFERENCE')
    commission_rate_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_terms_days = models.IntegerField(default=30)
    outstanding_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bank_details = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-id']

    def save(self, *args, **kwargs):
        if not self.account_code:
            self.account_code = self.generate_account_code()
        super().save(*args, **kwargs)
    
    def generate_account_code(self):
        """Generate automatic reseller account code"""
        from datetime import datetime
        
        # Get current year
        year = datetime.now().year
        
        # Count existing resellers
        existing_count = Reseller.objects.count() + 1
        
        # Generate code: RESL-YEAR-NUMBER
        return f"RESL-{year}-{existing_count:04d}"
    
    @property
    def calculated_reseller_balance(self):
        """Calculate total reseller balance from all transactions"""
        from django.db.models import Sum
        transactions = Transaction.objects.filter(reseller=self)
        total_balance = Decimal('0')
        
        for transaction in transactions:
            if transaction.total_amount:
                # Use dealership_price as system price if available
                if transaction.dealership_price and transaction.dealership_price > 0:
                    system_sale_price = transaction.dealership_price * transaction.quantity
                else:
                    # Assume 75% of total is system price
                    system_sale_price = transaction.total_amount * Decimal('0.75')
                total_balance += transaction.total_amount - system_sale_price
        
        return total_balance

    def __str__(self):
        return self.name


class Transaction(models.Model):
    STATUS_CHOICES = [
        ('RECEIVED', 'Product Received'),
        ('SOLD', 'Product Sold'),
        ('PAID_TO_COLLECT', 'Paid but to be Collected'),
        ('COLLECTED_TO_PAY', 'Collected but to Pay Later'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    reseller = models.ForeignKey(Reseller, on_delete=models.CASCADE, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.IntegerField(validators=[MinValueValidator(1)], default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    dealership_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sale_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_taxed = models.BooleanField(default=False)
    zimra_receipt_no = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    payment_method = models.CharField(max_length=15, default='CASH')

    class Meta:
        ordering = ['-timestamp']

    @property
    def product_names(self):
        if hasattr(self, 'items') and self.items.exists():
            items = list(self.items.all())
            if len(items) == 1:
                return items[0].product.name
            elif len(items) > 1:
                return f"{items[0].product.name}, etc"
            return "No Products"
        return self.product.name if self.product else "No Product"
    
    @property
    def reseller_balance(self):
        if self.reseller and self.total_amount:
            total_amount = self.total_amount
            # Use dealership_price as system price if available
            if self.dealership_price and self.dealership_price > 0:
                system_sale_price = self.dealership_price * self.quantity
            else:
                # Assume 75% of total is system price
                system_sale_price = total_amount * Decimal('0.75')
            return total_amount - system_sale_price
        return 0

    def save(self, *args, **kwargs):
        # Set sale_price to product's default price if not set and product exists
        if self.product and not self.sale_price:
            self.sale_price = self.product.default_sale_price
        
        # Calculate total amount if not set
        if not self.total_amount and self.sale_price:
            self.total_amount = self.sale_price * self.quantity
        
        if self.is_taxed:
            business = BusinessProfile.objects.first()
            if business:
                tax_rate = business.zimra_tax_rate / 100
                self.tax_amount = self.total_amount * tax_rate
        super().save(*args, **kwargs)

    def __str__(self):
        product_name = self.product.name if self.product else "No Product"
        return f"{product_name} - {self.status} - {self.timestamp.date()}"


class TransactionItem(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(validators=[MinValueValidator(1)], default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ ${self.unit_price}"


class ResellerSale(models.Model):
    reseller = models.ForeignKey(Reseller, on_delete=models.CASCADE, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    dealership_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reseller_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity = models.IntegerField(validators=[MinValueValidator(1)], default=1)
    profit_margin = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.profit_margin = (self.reseller_price - self.dealership_price) * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        reseller_name = self.reseller.name if self.reseller else "No Reseller"
        product_name = self.product.name if self.product else "No Product"
        return f"{reseller_name} - {product_name}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    transactions = models.ManyToManyField(Transaction, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_due = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        customer_name = self.customer.name if self.customer else "No Customer"
        return f"Invoice {self.invoice_number} - {customer_name}"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('ECOCASH', 'EcoCash'),
        ('ONE_MONEY', 'One Money'),
        ('MUKURU', 'Mukuru'),
        ('INBUCKS', 'Inbucks'),
        ('MAMA_MONEY', 'Mama Money'),
        ('BANK', 'Bank Transfer'),
        ('CARD', 'Card'),
        ('OTHER', 'Other'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    reseller = models.ForeignKey(Reseller, on_delete=models.CASCADE, null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], default=0)
    payment_method = models.CharField(max_length=15, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    reference_number = models.CharField(max_length=100, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        if self.customer:
            return f"Payment from {self.customer.name} - ${self.amount}"
        elif self.reseller:
            return f"Payment to {self.reseller.name} - ${self.amount}"
        return f"Payment - ${self.amount}"


class StockMovement(models.Model):
    MOVEMENT_CHOICES = [
        ('RECEIPT', 'Receipt'),
        ('SALE', 'Sale'),
        ('ADJUSTMENT_IN', 'Adjustment In'),
        ('ADJUSTMENT_OUT', 'Adjustment Out'),
        ('RETURN_IN', 'Return In'),
        ('RETURN_OUT', 'Return Out'),
    ]

    REASON_CHOICES = [
        ('SALE', 'Sale'),
        ('PURCHASE', 'Purchase'),
        ('DAMAGE', 'Damage'),
        ('THEFT', 'Theft'),
        ('COUNT_DIFFERENCE', 'Count Difference'),
        ('RETURN', 'Return'),
        ('OTHER', 'Other'),
    ]

    movement_type = models.CharField(max_length=15, choices=MOVEMENT_CHOICES, default='OTHER')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.IntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reference_doc_type = models.CharField(max_length=20, blank=True)
    reference_doc_id = models.IntegerField(null=True, blank=True)
    performed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='OTHER')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        product_name = self.product.name if self.product else "No Product"
        return f"{product_name} - {self.movement_type} - {self.quantity}"


class StockTake(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    counted_quantity = models.IntegerField(default=0)
    system_quantity = models.IntegerField(default=0)
    difference = models.IntegerField(default=0)
    performed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']

    def save(self, *args, **kwargs):
        # Set system quantity to current product stock if not already set
        if self.product and not self.system_quantity:
            self.system_quantity = self.product.stock_quantity
        self.difference = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)

    def __str__(self):
        product_name = self.product.name if self.product else "No Product"
        return f"Stock Take - {product_name} - {self.date.date()}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('STOCK_ALERT', 'Stock Alert'),
        ('PAYMENT_DUE', 'Payment Due'),
        ('LOW_STOCK', 'Low Stock'),
        ('GENERAL', 'General'),
    ]

    message = models.TextField()
    notification_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    related_product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    related_customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    related_reseller = models.ForeignKey(Reseller, on_delete=models.CASCADE, null=True, blank=True)
    created_for = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.notification_type} - {self.timestamp.date()}"


class CashDrawer(models.Model):
    opened_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    opening_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        opened_by_name = self.opened_by.username if self.opened_by else "Unknown User"
        return f"Cash Drawer - {self.opened_at.date()} - {opened_by_name}"


class Receipt(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True, blank=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=15, choices=Payment.PAYMENT_METHOD_CHOICES, default='CASH')
    printed_at = models.DateTimeField(auto_now_add=True)
    printed_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    zimra_receipt_no = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-printed_at']

    def __str__(self):
        return f"Receipt {self.receipt_number or 'No Number'}"


class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Expense Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Expense(models.Model):
    EXPENSE_TYPE_CHOICES = [
        ('OPERATIONAL', 'Operational'),
        ('ADMINISTRATIVE', 'Administrative'),
        ('MARKETING', 'Marketing'),
        ('MAINTENANCE', 'Maintenance'),
        ('UTILITIES', 'Utilities'),
        ('RENT', 'Rent'),
        ('SALARIES', 'Salaries'),
        ('OTHER', 'Other'),
    ]

    category = models.ForeignKey(ExpenseCategory, on_delete=models.CASCADE, null=True, blank=True)
    expense_type = models.CharField(max_length=15, choices=EXPENSE_TYPE_CHOICES, default='OTHER')
    description = models.CharField(max_length=200, default='No description')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    receipt_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.description or 'No Description'} - ${self.amount}"


class Loss(models.Model):
    LOSS_TYPE_CHOICES = [
        ('DAMAGE', 'Product Damage'),
        ('THEFT', 'Theft'),
        ('EXPIRY', 'Product Expiry'),
        ('WRITE_OFF', 'Write Off'),
        ('BAD_DEBT', 'Bad Debt'),
        ('OTHER', 'Other'),
    ]

    loss_type = models.CharField(max_length=15, choices=LOSS_TYPE_CHOICES, default='OTHER')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=200, default='No description')
    quantity = models.IntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_loss_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if self.product and self.quantity:
            self.total_loss_amount = self.unit_cost * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_loss_type_display()} - ${self.total_loss_amount}"


class ProfitLossReport(models.Model):
    PERIOD_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('YEARLY', 'Yearly'),
    ]

    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='DAILY')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Revenue
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Costs
    cost_of_goods_sold = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_losses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Calculated fields
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    profit_margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Calculate gross profit
        self.gross_profit = self.total_sales - self.cost_of_goods_sold
        
        # Calculate net profit
        self.net_profit = self.gross_profit - self.total_expenses - self.total_losses
        
        # Calculate profit margin percentage
        if self.total_sales > 0:
            self.profit_margin_percentage = (self.net_profit / self.total_sales) * 100
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_period_type_display()} P&L: {self.start_date or 'N/A'} to {self.end_date or 'N/A'}"


class DailySummary(models.Model):
    date = models.DateField(unique=True)
    
    # Sales metrics
    total_transactions = models.IntegerField(default=0)
    total_sales_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ecocash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Product metrics
    products_received = models.IntegerField(default=0)
    products_sold = models.IntegerField(default=0)
    products_to_collect = models.IntegerField(default=0)
    products_to_pay = models.IntegerField(default=0)
    
    # Financial metrics
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_losses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_of_goods_sold = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Customer metrics
    new_customers = models.IntegerField(default=0)
    payments_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Daily Summary - {self.date}"


class PaymentCollection(models.Model):
    COLLECTION_TYPE_CHOICES = [
        ('CUSTOMER_DEBT', 'Customer Debt'),
        ('ITEM_TO_COLLECT', 'Item to Collect'),
        ('RESELLER_PAYMENT', 'Reseller Payment'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('COLLECTED', 'Collected'),
        ('CANCELLED', 'Cancelled'),
    ]

    collection_type = models.CharField(max_length=20, choices=COLLECTION_TYPE_CHOICES, default='CUSTOMER_DEBT')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True)
    reseller = models.ForeignKey(Reseller, on_delete=models.CASCADE, null=True, blank=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField(auto_now_add=True)
    reminder_date = models.DateField(null=True, blank=True)
    description = models.TextField(default='No description')
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_collections_created', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def customer_name(self):
        return self.customer.name if self.customer else None
    
    @property
    def reseller_name(self):
        return self.reseller.name if self.reseller else None

    def __str__(self):
        if self.customer:
            return f"{self.get_collection_type_display()} - {self.customer.name} - ${self.amount}"
        elif self.reseller:
            return f"{self.get_collection_type_display()} - {self.reseller.name} - ${self.amount}"
        return f"Payment Collection - ${self.amount}"





        