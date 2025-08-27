# Transaction model fixes

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

@property
def reseller_balance(self):
    if self.reseller and self.total_amount and self.sale_price:
        # Calculate markup: total_amount - (sale_price * quantity)
        base_amount = self.sale_price * self.quantity
        return self.total_amount - base_amount
    return 0

# PaymentCollection model fix
created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_collections_created', null=True, blank=True)