from django.contrib import admin
from django.utils.html import format_html
from .models import *


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'legal_name', 'tax_number', 'zimra_enabled']
    fieldsets = (
        ('Basic Information', {
            'fields': ('business_name', 'legal_name', 'tax_number', 'address', 'phone', 'email', 'logo', 'invoice_header_color')
        }),
        ('Settings', {
            'fields': ('default_currency', 'timezone', 'zimra_enabled', 'zimra_tax_rate')
        }),
        ('Templates', {
            'fields': ('invoice_footer_text', 'receipt_footer_text')
        }),
    )


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'user', 'role', 'can_override_price', 'can_discount', 'is_active']
    list_filter = ['role', 'is_active', 'can_override_price', 'can_discount']
    search_fields = ['display_name', 'user__username', 'user__email']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_info', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'contact_info']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_unique_code', 'category', 'stock_quantity', 'default_sale_price', 'is_low_stock_display', 'is_active']
    list_filter = ['category', 'tax_group', 'is_active', 'is_serial_tracked']
    search_fields = ['name', 'product_unique_code', 'barcode']
    readonly_fields = ['product_unique_code', 'cost_price_avg', 'last_purchase_price']
    
    def is_low_stock_display(self, obj):
        if obj.is_low_stock:
            return format_html('<span style="color: red;">Low Stock</span>')
        return format_html('<span style="color: green;">OK</span>')
    is_low_stock_display.short_description = 'Stock Status'


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone_no', 'email', 'account_code', 'outstanding_balance', 'is_active']
    list_filter = ['is_active', 'date_created']
    search_fields = ['name', 'phone_no', 'email', 'account_code', 'national_id_no']
    readonly_fields = ['account_code', 'outstanding_balance', 'date_created']


@admin.register(Reseller)
class ResellerAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'settlement_mode', 'current_balance', 'is_active']
    list_filter = ['settlement_mode', 'is_active']
    search_fields = ['name', 'company_name', 'contact_info']
    readonly_fields = ['current_balance']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'status', 'total_amount', 'sale_by', 'timestamp']
    list_filter = ['status', 'is_taxed', 'timestamp']
    search_fields = ['customer__name', 'reseller__name', 'zimra_receipt_no']
    readonly_fields = ['total_amount', 'tax_amount', 'timestamp']
    date_hierarchy = 'timestamp'


@admin.register(ResellerSale)
class ResellerSaleAdmin(admin.ModelAdmin):
    list_display = ['reseller', 'product', 'quantity', 'profit_margin', 'timestamp']
    list_filter = ['timestamp']
    search_fields = ['reseller__name', 'product__name']
    readonly_fields = ['profit_margin', 'timestamp']
    date_hierarchy = 'timestamp'


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    readonly_fields = ['total_price']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'status', 'total_amount', 'created_at', 'due_date']
    list_filter = ['status', 'created_at']
    search_fields = ['invoice_number', 'customer__name']
    readonly_fields = ['invoice_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at']
    date_hierarchy = 'created_at'
    inlines = [InvoiceItemInline]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'product', 'quantity', 'unit_price', 'total_price']
    list_filter = ['invoice__created_at']
    search_fields = ['invoice__invoice_number', 'product__name']
    readonly_fields = ['total_price']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['get_payee', 'amount', 'payment_method', 'date', 'recorded_by']
    list_filter = ['payment_method', 'date']
    search_fields = ['customer__name', 'reseller__name', 'reference_number']
    readonly_fields = ['date']
    date_hierarchy = 'date'
    
    def get_payee(self, obj):
        if obj.customer:
            return f"Customer: {obj.customer.name}"
        elif obj.reseller:
            return f"Reseller: {obj.reseller.name}"
        return "Unknown"
    get_payee.short_description = 'Payee'


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'reason', 'performed_by', 'timestamp']
    list_filter = ['movement_type', 'reason', 'timestamp']
    search_fields = ['product__name', 'notes']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'


@admin.register(StockTake)
class StockTakeAdmin(admin.ModelAdmin):
    list_display = ['product', 'system_quantity', 'counted_quantity', 'difference', 'performed_by', 'date']
    list_filter = ['date']
    search_fields = ['product__name']
    readonly_fields = ['difference', 'date']
    date_hierarchy = 'date'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['message_preview', 'notification_type', 'is_read', 'timestamp']
    list_filter = ['notification_type', 'is_read', 'timestamp']
    search_fields = ['message']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def message_preview(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'


@admin.register(CashDrawer)
class CashDrawerAdmin(admin.ModelAdmin):
    list_display = ['opened_by', 'opening_amount', 'closing_amount', 'opened_at', 'closed_at', 'is_active']
    list_filter = ['is_active', 'opened_at']
    search_fields = ['opened_by__username']
    readonly_fields = ['opened_at', 'closed_at']
    date_hierarchy = 'opened_at'


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'transaction', 'customer', 'total_amount', 'payment_method', 'printed_at']
    list_filter = ['payment_method', 'printed_at']
    search_fields = ['receipt_number', 'customer__name', 'zimra_receipt_no']
    readonly_fields = ['printed_at']
    date_hierarchy = 'printed_at'


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['description', 'category', 'expense_type', 'amount', 'date', 'recorded_by']
    list_filter = ['expense_type', 'category', 'is_recurring', 'date']
    search_fields = ['description', 'receipt_reference']
    readonly_fields = ['date']
    date_hierarchy = 'date'


@admin.register(Loss)
class LossAdmin(admin.ModelAdmin):
    list_display = ['description', 'loss_type', 'product', 'total_loss_amount', 'date', 'recorded_by']
    list_filter = ['loss_type', 'date']
    search_fields = ['description', 'product__name']
    readonly_fields = ['total_loss_amount', 'date']
    date_hierarchy = 'date'


@admin.register(ProfitLossReport)
class ProfitLossReportAdmin(admin.ModelAdmin):
    list_display = ['period_type', 'start_date', 'end_date', 'total_sales', 'net_profit', 'profit_margin_percentage']
    list_filter = ['period_type', 'generated_at']
    readonly_fields = ['gross_profit', 'net_profit', 'profit_margin_percentage', 'generated_at']
    date_hierarchy = 'generated_at'


@admin.register(DailySummary)
class DailySummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_transactions', 'total_sales_amount', 'gross_profit', 'net_profit']
    list_filter = ['date']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'




@admin.register(PaymentCollection)
class PaymentCollectionAdmin(admin.ModelAdmin):
    list_display = ['collection_type', 'get_entity', 'amount', 'status', 'due_date', 'created_at']
    list_filter = ['collection_type', 'status', 'created_at']
    search_fields = ['customer__name', 'reseller__name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def get_entity(self, obj):
        if obj.customer:
            return f"Customer: {obj.customer.name}"
        elif obj.reseller:
            return f"Reseller: {obj.reseller.name}"
        return "No Entity"
    get_entity.short_description = 'Entity'


