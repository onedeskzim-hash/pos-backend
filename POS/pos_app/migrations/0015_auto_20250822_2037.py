from django.db import migrations

def link_transactions_to_products(apps, schema_editor):
    Transaction = apps.get_model('pos_app', 'Transaction')
    Product = apps.get_model('pos_app', 'Product')
    
    # Get first product or create a default one
    first_product = Product.objects.first()
    if not first_product:
        first_product = Product.objects.create(
            name='Default Product',
            default_sale_price=0,
            category_id=1  # Assuming category exists
        )
    
    # Link all transactions without products to the first product
    Transaction.objects.filter(product__isnull=True).update(product=first_product)

def reverse_link_transactions(apps, schema_editor):
    # Reverse operation - set product to null
    Transaction = apps.get_model('pos_app', 'Transaction')
    Transaction.objects.all().update(product=None)

class Migration(migrations.Migration):

    dependencies = [
        ('pos_app', '0014_transaction_product'),
    ]

    operations = [
        migrations.RunPython(link_transactions_to_products, reverse_link_transactions),
    ]