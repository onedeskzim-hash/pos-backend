from rest_framework import serializers
from .models import *


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = '__all__'


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
    
    def validate_name(self, value):
        name = value.strip().title() if value else ''
        if not name:
            raise serializers.ValidationError('Category name is required')
        
        # Check for existing category with same name (case-insensitive)
        existing = Category.objects.filter(name__iexact=name)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        
        if existing.exists():
            raise serializers.ValidationError(f'Category "{name}" already exists')
        
        return name


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('account_code', 'date_created')
    
    def validate(self, data):
        name = data.get('name', '').strip() if data.get('name') else ''
        phone_no = data.get('phone_no', '').strip() if data.get('phone_no') else ''
        
        if not name:
            raise serializers.ValidationError({'name': ['Customer name is required']})
        if not phone_no:
            raise serializers.ValidationError({'phone_no': ['Phone number is required']})
        
        data['name'] = name
        data['phone_no'] = phone_no
        
        if 'credit_limit' not in data:
            data['credit_limit'] = 0
        if 'outstanding_balance' not in data:
            data['outstanding_balance'] = 0
        if 'payment_terms_days' not in data:
            data['payment_terms_days'] = 30
        if 'is_active' not in data:
            data['is_active'] = True
        
        return data


class ResellerSerializer(serializers.ModelSerializer):
    calculated_reseller_balance = serializers.ReadOnlyField()
    
    class Meta:
        model = Reseller
        fields = '__all__'
        read_only_fields = ('account_code',)
    
    def validate(self, data):
        name = data.get('name', '').strip() if data.get('name') else ''
        phone_no = data.get('phone_no', '').strip() if data.get('phone_no') else ''
        
        if not name:
            raise serializers.ValidationError({'name': ['Reseller name is required']})
        if not phone_no:
            raise serializers.ValidationError({'phone_no': ['Phone number is required']})
        
        data['name'] = name
        data['phone_no'] = phone_no
        
        if 'commission_rate_pct' not in data:
            data['commission_rate_pct'] = 0
        if 'current_balance' not in data:
            data['current_balance'] = 0
        if 'credit_limit' not in data:
            data['credit_limit'] = 0
        if 'outstanding_balance' not in data:
            data['outstanding_balance'] = 0
        if 'payment_terms_days' not in data:
            data['payment_terms_days'] = 30
        if 'is_active' not in data:
            data['is_active'] = True
        if 'settlement_mode' not in data:
            data['settlement_mode'] = 'PRICE_DIFFERENCE'
        
        return data


class TransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    reseller_name = serializers.CharField(source='reseller.name', read_only=True)
    display_sale_price = serializers.SerializerMethodField()
    display_reseller_balance = serializers.SerializerMethodField()
    display_product_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('sale_by', 'timestamp')
    
    def get_display_sale_price(self, obj):
        if obj.reseller:
            # For reseller: if dealership_price exists, use it as system price
            if obj.dealership_price and float(obj.dealership_price) > 0:
                return float(obj.dealership_price) * obj.quantity
            # Otherwise assume 75% of total is system price
            return float(obj.total_amount) * 0.75
        elif obj.sale_price and float(obj.sale_price) > 0:
            return float(obj.sale_price) * obj.quantity
        elif obj.product:
            return float(obj.product.default_sale_price) * obj.quantity
        return float(obj.total_amount)
    
    def get_display_reseller_balance(self, obj):
        if obj.reseller and obj.total_amount:
            total_amount = float(obj.total_amount)
            system_sale_price = self.get_display_sale_price(obj)
            return total_amount - system_sale_price
        return 0
    
    def get_display_product_names(self, obj):
        # Check if transaction has items
        if hasattr(obj, 'items') and obj.items.exists():
            items = list(obj.items.all())
            if len(items) == 1:
                return items[0].product.name
            elif len(items) > 1:
                return f"{items[0].product.name}, etc"
        # Check if transaction has a single product
        elif obj.product:
            return obj.product.name
        # Fallback for transactions without product references
        else:
            return "Mixed Products"


class ResellerSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResellerSale
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('date_created',)





class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ('performed_by', 'timestamp')


class StockTakeSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)
    
    class Meta:
        model = StockTake
        fields = '__all__'
        read_only_fields = ('performed_by', 'date', 'difference')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class CashDrawerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashDrawer
        fields = '__all__'


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('recorded_by', 'date')


class LossSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loss
        fields = '__all__'


class ProfitLossReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfitLossReport
        fields = '__all__'


class DailySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySummary
        fields = '__all__'


class PaymentCollectionSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    reseller_name = serializers.SerializerMethodField()
    transaction_id = serializers.IntegerField(source='transaction.id', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PaymentCollection
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')
    
    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else None
    
    def get_reseller_name(self, obj):
        return obj.reseller.name if obj.reseller else None
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero')
        return value