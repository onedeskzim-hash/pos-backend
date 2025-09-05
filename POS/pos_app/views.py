from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q, F
from drf_spectacular.utils import extend_schema
from django.db import transaction
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import *
from .serializers import *
import logging

logger = logging.getLogger(__name__)


class BusinessProfileViewSet(viewsets.ModelViewSet):
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer
    
    def perform_update(self, serializer):
        # Handle logo upload
        if 'logo' in self.request.FILES:
            serializer.validated_data['logo'] = self.request.FILES['logo']
        serializer.save()


class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        if 'password' in self.request.data:
            user.set_password(self.request.data['password'])
            user.save()
    
    def perform_update(self, serializer):
        user = serializer.save()
        if 'password' in self.request.data and self.request.data['password']:
            user.set_password(self.request.data['password'])
            user.save()
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        user = self.get_object()
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(old_password):
            return Response({'error': 'Invalid old password'}, status=400)
        
        user.set_password(new_password)
        user.save()
        return Response({'status': 'Password changed successfully'})


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_queryset(self):
        queryset = Product.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(product_unique_code__icontains=search) | 
                Q(barcode__icontains=search)
            )
        return queryset
    
    @extend_schema(description="Get products with low stock")
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        products = Product.objects.filter(stock_quantity__lte=F('low_stock_threshold'))
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
    
    @extend_schema(description="Get out of stock products")
    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        products = Product.objects.filter(stock_quantity=0)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    
    @extend_schema(description="Get customers with outstanding balance")
    @action(detail=False, methods=['get'])
    def with_balance(self, request):
        customers = Customer.objects.filter(outstanding_balance__gt=0)
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)


class ResellerViewSet(viewsets.ModelViewSet):
    queryset = Reseller.objects.all()
    serializer_class = ResellerSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    
    def perform_create(self, serializer):
        try:
            # Get items data from request if present
            items_data = self.request.data.get('items', [])
            
            # Automatically set the sale_by field to the current user
            transaction = serializer.save(sale_by=self.request.user)
            
            # Create transaction items if provided
            if items_data:
                total_amount = 0
                for item_data in items_data:
                    product = Product.objects.get(id=item_data['product'])
                    quantity = int(item_data['quantity'])
                    unit_price = float(item_data.get('unit_price', product.default_sale_price))
                    
                    TransactionItem.objects.create(
                        transaction=transaction,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price
                    )
                    total_amount += unit_price * quantity
                    
                    # Update stock for multi-item transaction
                    if transaction.status in ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']:
                        product.stock_quantity -= quantity
                        product.save()
                        
                        # Create stock movement record
                        StockMovement.objects.create(
                            movement_type='SALE',
                            product=product,
                            quantity=quantity,
                            unit_cost=product.cost_price_avg,
                            reason='SALE',
                            notes=f'Sale transaction {transaction.id}',
                            performed_by=self.request.user
                        )
                
                # Update transaction total
                transaction.total_amount = total_amount
                transaction.save()
            
            # Update stock for single product transaction
            elif transaction.product and transaction.status in ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']:
                # Reduce stock for sales
                product = transaction.product
                product.stock_quantity -= transaction.quantity
                product.save()
                
                # Create stock movement record
                StockMovement.objects.create(
                    movement_type='SALE',
                    product=product,
                    quantity=transaction.quantity,
                    unit_cost=product.cost_price_avg,
                    reason='SALE',
                    notes=f'Sale transaction {transaction.id}',
                    performed_by=self.request.user
                )
            
            # Automatically create receipt for sales transactions
            if transaction.status in ['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']:
                self.create_receipt(transaction)
        except Exception as e:
            print(f"Error creating transaction: {e}")
            raise
    
    def create_receipt(self, transaction):
        """Create a receipt for the transaction"""
        from datetime import datetime
        
        # Generate receipt number
        receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{transaction.id:06d}"
        
        # Create receipt
        receipt = Receipt.objects.create(
            receipt_number=receipt_number,
            transaction=transaction,
            customer=transaction.customer,
            total_amount=transaction.total_amount,
            tax_amount=transaction.tax_amount,
            payment_method=transaction.payment_method,
            printed_by=self.request.user,
            zimra_receipt_no=transaction.zimra_receipt_no
        )
        
        print(f"Receipt created: {receipt.receipt_number} for transaction {transaction.id}")
        
        # Print receipt details to console for immediate viewing
        self.print_receipt_to_console(receipt)
        
        return receipt
    
    def print_receipt_to_console(self, receipt):
        """Print receipt details to console"""
        business = BusinessProfile.objects.first()
        
        print("\n" + "=" * 50)
        print(f"           {business.business_name if business else 'GiveSolar-POS'}")
        if business:
            print(f"           {business.address}")
            print(f"           Tel: {business.phone}")
            if business.tax_number:
                print(f"           Tax No: {business.tax_number}")
        print("=" * 50)
        print(f"Receipt No: {receipt.receipt_number}")
        print(f"Date: {receipt.printed_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Cashier: {receipt.printed_by.username}")
        if receipt.customer:
            print(f"Customer: {receipt.customer.name}")
        print("-" * 50)
        print("ITEMS:")
        if receipt.transaction.items.exists():
            for item in receipt.transaction.items.all():
                print(f"{item.product.name} x {item.quantity} @ ${item.unit_price} = ${item.total_price}")
        else:
            # Single product transaction
            if receipt.transaction.product:
                print(f"{receipt.transaction.product.name} x {receipt.transaction.quantity} @ ${receipt.transaction.sale_price} = ${receipt.transaction.total_amount}")
        print(f"Total Quantity: {receipt.transaction.quantity}")
        print(f"Total: ${receipt.total_amount}")
        if receipt.tax_amount > 0:
            print(f"Tax: ${receipt.tax_amount}")
        print("-" * 50)
        print(f"Payment Method: {receipt.payment_method}")
        if receipt.zimra_receipt_no:
            print(f"ZIMRA Receipt: {receipt.zimra_receipt_no}")
        print("-" * 50)
        if business and business.receipt_footer_text:
            print(f"           {business.receipt_footer_text}")
        else:
            print("           Thank you for your business!")
        print("=" * 50 + "\n")
    
    @extend_schema(description="Get today's sales transactions")
    @action(detail=False, methods=['get'])
    def daily_sales(self, request):
        from django.utils import timezone
        today = timezone.now().date()
        transactions = Transaction.objects.filter(
            timestamp__date=today,
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
    
    @extend_schema(description="Get products paid but to be collected")
    @action(detail=False, methods=['get'])
    def to_collect(self, request):
        transactions = Transaction.objects.filter(status='PAID_TO_COLLECT')
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
    
    @extend_schema(description="Get products collected but to pay later")
    @action(detail=False, methods=['get'])
    def to_pay(self, request):
        transactions = Transaction.objects.filter(status='COLLECTED_TO_PAY')
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)


class ResellerSaleViewSet(viewsets.ModelViewSet):
    queryset = ResellerSale.objects.all()
    serializer_class = ResellerSaleSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    
    def perform_create(self, serializer):
        try:
            from decimal import Decimal
            items_data = self.request.data.get('items', [])
            invoice = serializer.save(created_by=self.request.user)
            
            # Create invoice items
            subtotal = Decimal('0')
            for item_data in items_data:
                product = Product.objects.get(id=item_data['product'])
                quantity = int(item_data['quantity'])
                unit_price = Decimal(str(item_data.get('unit_price', product.default_sale_price)))
                
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price
                )
                subtotal += unit_price * quantity
            
            # Calculate tax and total
            business = BusinessProfile.objects.first()
            tax_rate = business.zimra_tax_rate / 100 if business and business.zimra_enabled else Decimal('0')
            tax_amount = subtotal * tax_rate
            total_amount = subtotal + tax_amount
            
            # Update invoice totals
            invoice.subtotal = subtotal
            invoice.tax_amount = tax_amount
            invoice.total_amount = total_amount
            invoice.save()
            
        except Exception as e:
            logger.error(f"Error creating invoice: {e}")
            raise
    
    @extend_schema(description="Get pending invoices")
    @action(detail=False, methods=['get'])
    def pending(self, request):
        invoices = Invoice.objects.filter(status='PENDING')
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
    
    @extend_schema(description="Get overdue invoices")
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        invoices = Invoice.objects.filter(status='OVERDUE')
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    
    def perform_create(self, serializer):
        try:
            movement = serializer.save(performed_by=self.request.user)
            # Update product stock quantity
            product = movement.product
            if movement.movement_type in ['RECEIPT', 'ADJUSTMENT_IN', 'RETURN_IN']:
                product.stock_quantity += movement.quantity
            elif movement.movement_type in ['SALE', 'ADJUSTMENT_OUT', 'RETURN_OUT']:
                product.stock_quantity -= movement.quantity
            product.save()
        except Exception as e:
            print(f"Error creating stock movement: {e}")
            raise


class StockTakeViewSet(viewsets.ModelViewSet):
    queryset = StockTake.objects.all()
    serializer_class = StockTakeSerializer
    
    def perform_create(self, serializer):
        try:
            # Set system quantity to current product stock before saving
            product = serializer.validated_data.get('product')
            if product:
                serializer.validated_data['system_quantity'] = product.stock_quantity
            
            stock_take = serializer.save(performed_by=self.request.user)
            
            # Update product stock if there's a difference
            if stock_take.difference != 0:
                product = stock_take.product
                product.stock_quantity = stock_take.counted_quantity
                product.save()
                # Create stock movement record for the adjustment
                StockMovement.objects.create(
                    movement_type='ADJUSTMENT_IN' if stock_take.difference > 0 else 'ADJUSTMENT_OUT',
                    product=product,
                    quantity=abs(stock_take.difference),
                    unit_cost=product.cost_price_avg,
                    reason='COUNT_DIFFERENCE',
                    notes=f'Stock take adjustment: {stock_take.notes}',
                    performed_by=self.request.user
                )
        except Exception as e:
            print(f"Error creating stock take: {e}")
            raise


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can delete notifications'}, status=403)
        return super().destroy(request, *args, **kwargs)
    
    @extend_schema(description="Get unread notifications")
    @action(detail=False, methods=['get'])
    def unread(self, request):
        notifications = Notification.objects.filter(is_read=False).order_by('-timestamp')
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @extend_schema(description="Mark notification as read")
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    
    @extend_schema(description="Mark all notifications as read")
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        count = Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': f'{count} notifications marked as read'})
    
    @extend_schema(description="Delete all notifications")
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can delete all notifications'}, status=403)
        count = Notification.objects.count()
        Notification.objects.all().delete()
        return Response({'status': f'{count} notifications deleted'})
    
    @extend_schema(description="Create test notifications for debugging")
    @action(detail=False, methods=['post'])
    def create_test_notifications(self, request):
        from datetime import datetime
        
        # Create test notifications of each type
        notifications_created = []
        
        # 1. General notification
        notif1 = Notification.objects.create(
            message=f'Test general notification created at {datetime.now().strftime("%H:%M:%S")}',
            notification_type='GENERAL'
        )
        notifications_created.append(notif1.id)
        
        # 2. Low stock notification
        product = Product.objects.first()
        if product:
            notif2 = Notification.objects.create(
                message=f'Test low stock alert: {product.name} has only 2 units remaining',
                notification_type='LOW_STOCK',
                related_product=product
            )
            notifications_created.append(notif2.id)
        
        # 3. Payment due notification
        customer = Customer.objects.first()
        if customer:
            notif3 = Notification.objects.create(
                message=f'Test payment overdue: {customer.name} has outstanding balance of $500',
                notification_type='PAYMENT_DUE',
                related_customer=customer
            )
            notifications_created.append(notif3.id)
        
        # 4. Stock alert notification
        if product:
            notif4 = Notification.objects.create(
                message=f'Test stock alert: Damage recorded for {product.name} - $100',
                notification_type='STOCK_ALERT',
                related_product=product
            )
            notifications_created.append(notif4.id)
        
        return Response({
            'status': f'{len(notifications_created)} test notifications created',
            'notification_ids': notifications_created,
            'total_notifications': Notification.objects.count()
        })


class CashDrawerViewSet(viewsets.ModelViewSet):
    queryset = CashDrawer.objects.all()
    serializer_class = CashDrawerSerializer
    
    @extend_schema(description="Get active cash drawer")
    @action(detail=False, methods=['get'])
    def active(self, request):
        drawer = CashDrawer.objects.filter(is_active=True).first()
        if drawer:
            serializer = self.get_serializer(drawer)
            return Response(serializer.data)
        return Response({'message': 'No active cash drawer'}, status=404)


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    
    @extend_schema(description="Print receipt with business details")
    @action(detail=True, methods=['get'])
    def print_receipt(self, request, pk=None):
        receipt = self.get_object()
        business = BusinessProfile.objects.first()
        
        receipt_data = {
            'receipt': {
                'receipt_number': receipt.receipt_number,
                'date': receipt.printed_at.strftime('%Y-%m-%d %H:%M:%S'),
                'total_amount': float(receipt.total_amount),
                'tax_amount': float(receipt.tax_amount),
                'payment_method': receipt.payment_method,
                'zimra_receipt_no': receipt.zimra_receipt_no,
            },
            'business': {
                'business_name': business.business_name if business else 'GiveSolar-POS',
                'legal_name': business.legal_name if business else '',
                'address': business.address if business else '',
                'phone': business.phone if business else '',
                'email': business.email if business else '',
                'tax_number': business.tax_number if business else '',
                'receipt_footer_text': business.receipt_footer_text if business else 'Thank you for your business!',
                'logo': f'https://pos-backend-cqf3.onrender.com{business.logo.url}' if business and business.logo else None,
            },
            'transaction': {
                'product_name': receipt.transaction.product_names,
                'quantity': receipt.transaction.quantity,
                'unit_price': float(receipt.transaction.sale_price),
                'total_amount': float(receipt.transaction.total_amount),
                'reseller_balance': float(receipt.transaction.reseller_balance) if receipt.transaction.reseller else 0,
                'status': receipt.transaction.status,
                'notes': receipt.transaction.notes,
                'items': [{
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price)
                } for item in receipt.transaction.items.all()]
            },
            'customer': {
                'name': receipt.customer.name if receipt.customer else 'Walk-in Customer',
                'phone': receipt.customer.phone_no if receipt.customer else '',
                'account_code': receipt.customer.account_code if receipt.customer else '',
                'email': receipt.customer.email if receipt.customer else '',
            } if receipt.customer else None,
            'staff': {
                'name': hasattr(receipt.printed_by, 'staffprofile') and receipt.printed_by.staffprofile.display_name or receipt.printed_by.username,
                'username': receipt.printed_by.username,
            }
        }
        
        return Response(receipt_data)
    
    @extend_schema(description="Download receipt as PDF")
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from django.http import HttpResponse
        from io import BytesIO
        
        receipt = self.get_object()
        business = BusinessProfile.objects.first()
        
        # Create PDF in memory buffer
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=(4*inch, 6*inch))
        
        # Enable compression
        p._doc.compress = 1
        
        # Add logo if exists
        y_pos = 5.5*inch
        if business and business.logo:
            try:
                import os
                logo_path = business.logo.path
                if os.path.exists(logo_path):
                    p.drawImage(logo_path, 1.5*inch, y_pos, width=1*inch, height=0.5*inch)
                    y_pos -= 0.7*inch
            except:
                pass
        
        # Business info
        p.setFont("Helvetica-Bold", 14)
        p.drawCentredString(2*inch, y_pos, business.business_name if business else 'GiveSolar-POS')
        y_pos -= 0.2*inch
        
        p.setFont("Helvetica", 8)
        if business:
            p.drawCentredString(2*inch, y_pos, business.address)
            y_pos -= 0.15*inch
            p.drawCentredString(2*inch, y_pos, f"Tel: {business.phone}")
            y_pos -= 0.15*inch
            if business.tax_number:
                p.drawCentredString(2*inch, y_pos, f"Tax No: {business.tax_number}")
                y_pos -= 0.15*inch
        
        # Receipt details
        y_pos -= 0.2*inch
        p.line(0.2*inch, y_pos, 3.8*inch, y_pos)
        y_pos -= 0.2*inch
        
        p.drawString(0.2*inch, y_pos, f"Receipt No: {receipt.receipt_number}")
        y_pos -= 0.15*inch
        p.drawString(0.2*inch, y_pos, f"Date: {receipt.printed_at.strftime('%Y-%m-%d %H:%M')}")
        y_pos -= 0.15*inch
        p.drawString(0.2*inch, y_pos, f"Cashier: {hasattr(receipt.printed_by, 'staffprofile') and receipt.printed_by.staffprofile.display_name or receipt.printed_by.username}")
        y_pos -= 0.15*inch
        
        if receipt.customer:
            p.drawString(0.2*inch, y_pos, f"Customer: {receipt.customer.name}")
            y_pos -= 0.15*inch
        
        # Items
        y_pos -= 0.1*inch
        p.line(0.2*inch, y_pos, 3.8*inch, y_pos)
        y_pos -= 0.2*inch
        
        p.setFont("Helvetica-Bold", 9)
        p.drawString(0.2*inch, y_pos, "ITEMS:")
        y_pos -= 0.15*inch
        
        p.setFont("Helvetica", 8)
        for item in receipt.transaction.items.all():
            p.drawString(0.2*inch, y_pos, f"{item.product.name}")
            y_pos -= 0.12*inch
            p.drawString(0.2*inch, y_pos, f"{item.quantity} x ${item.unit_price}")
            p.drawRightString(3.8*inch, y_pos, f"${item.total_price}")
            y_pos -= 0.15*inch
        
        if receipt.tax_amount > 0:
            p.drawString(0.2*inch, y_pos, "Tax:")
            p.drawRightString(3.8*inch, y_pos, f"${receipt.tax_amount}")
            y_pos -= 0.15*inch
        
        # Total
        y_pos -= 0.1*inch
        p.line(0.2*inch, y_pos, 3.8*inch, y_pos)
        y_pos -= 0.2*inch
        
        p.setFont("Helvetica-Bold", 10)
        p.drawString(0.2*inch, y_pos, "TOTAL:")
        p.drawRightString(3.8*inch, y_pos, f"${receipt.total_amount}")
        y_pos -= 0.15*inch
        
        p.setFont("Helvetica", 8)
        p.drawString(0.2*inch, y_pos, f"Payment: {receipt.payment_method}")
        y_pos -= 0.15*inch
        
        if receipt.zimra_receipt_no:
            p.drawString(0.2*inch, y_pos, f"ZIMRA: {receipt.zimra_receipt_no}")
            y_pos -= 0.15*inch
        
        # Transaction details
        y_pos -= 0.1*inch
        p.drawString(0.2*inch, y_pos, f"Status: {receipt.transaction.get_status_display()}")
        y_pos -= 0.15*inch
        
        if receipt.transaction.notes:
            p.drawString(0.2*inch, y_pos, "Notes:")
            y_pos -= 0.15*inch
            # Wrap long notes
            notes_lines = receipt.transaction.notes[:100].split('\n')
            for line in notes_lines[:3]:  # Max 3 lines
                p.drawString(0.2*inch, y_pos, line)
                y_pos -= 0.12*inch
        
        # Footer
        y_pos -= 0.2*inch
        p.line(0.2*inch, y_pos, 3.8*inch, y_pos)
        y_pos -= 0.2*inch
        
        if business and business.receipt_footer_text:
            p.drawCentredString(2*inch, y_pos, business.receipt_footer_text)
        
        p.showPage()
        p.save()
        
        # Get PDF data from buffer
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create HTTP response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt-{receipt.receipt_number}.pdf"'
        response['Content-Length'] = len(pdf_data)
        
        return response


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    
    def perform_create(self, serializer):
        try:
            serializer.save(recorded_by=self.request.user)
        except Exception as e:
            logger.error(f"Error creating expense: {e}")
            raise
    
    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can edit expenses'}, status=403)
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can edit expenses'}, status=403)
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can delete expenses'}, status=403)
        return super().destroy(request, *args, **kwargs)
    
    @extend_schema(description="Get expenses by type")
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        expense_type = request.query_params.get('type')
        if expense_type:
            expenses = Expense.objects.filter(expense_type=expense_type)
            serializer = self.get_serializer(expenses, many=True)
            return Response(serializer.data)
        return Response({'error': 'Type parameter required'}, status=400)


class LossViewSet(viewsets.ModelViewSet):
    queryset = Loss.objects.all()
    serializer_class = LossSerializer
    
    @extend_schema(description="Get losses by type")
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        loss_type = request.query_params.get('type')
        if loss_type:
            losses = Loss.objects.filter(loss_type=loss_type)
            serializer = self.get_serializer(losses, many=True)
            return Response(serializer.data)
        return Response({'error': 'Type parameter required'}, status=400)


class ProfitLossReportViewSet(viewsets.ModelViewSet):
    queryset = ProfitLossReport.objects.all()
    serializer_class = ProfitLossReportSerializer
    
    @extend_schema(description="Generate profit/loss report for period")
    @action(detail=False, methods=['post'])
    def generate(self, request):
        from datetime import datetime
        from django.utils import timezone
        
        period_type = request.data.get('period_type', 'MONTHLY')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date required'}, status=400)
        
        # Calculate metrics
        transactions = Transaction.objects.filter(
            timestamp__date__range=[start_date, end_date],
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        
        total_sales = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_tax = transactions.aggregate(Sum('tax_amount'))['tax_amount__sum'] or 0
        cost_of_goods = sum(t.dealership_price * t.quantity for t in transactions)
        
        expenses = Expense.objects.filter(date__date__range=[start_date, end_date])
        total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        
        losses = Loss.objects.filter(date__date__range=[start_date, end_date])
        total_losses = losses.aggregate(Sum('total_loss_amount'))['total_loss_amount__sum'] or 0
        
        # Create report
        report = ProfitLossReport.objects.create(
            period_type=period_type,
            start_date=start_date,
            end_date=end_date,
            total_sales=total_sales,
            total_tax_collected=total_tax,
            cost_of_goods_sold=cost_of_goods,
            total_expenses=total_expenses,
            total_losses=total_losses,
            generated_by=request.user
        )
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)


class DailySummaryViewSet(viewsets.ModelViewSet):
    queryset = DailySummary.objects.all()
    serializer_class = DailySummarySerializer
    
    @extend_schema(description="Generate daily summary for specific date")
    @action(detail=False, methods=['post'])
    def generate(self, request):
        from django.utils import timezone
        
        date = request.data.get('date', timezone.now().date())
        
        # Get or create daily summary
        summary, created = DailySummary.objects.get_or_create(
            date=date,
            defaults=self._calculate_daily_metrics(date)
        )
        
        if not created:
            # Update existing summary
            metrics = self._calculate_daily_metrics(date)
            for key, value in metrics.items():
                setattr(summary, key, value)
            summary.save()
        
        serializer = self.get_serializer(summary)
        return Response(serializer.data)
    
    def _calculate_daily_metrics(self, date):
        transactions = Transaction.objects.filter(timestamp__date=date)
        sales_transactions = transactions.filter(status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY'])
        
        expenses = Expense.objects.filter(date__date=date)
        losses = Loss.objects.filter(date__date=date)
        payments = Payment.objects.filter(date__date=date)
        
        total_sales = sales_transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        total_losses = losses.aggregate(Sum('total_loss_amount'))['total_loss_amount__sum'] or 0
        cost_of_goods = sum(item.product.cost_price_avg * item.quantity for t in sales_transactions for item in t.items.all()) or 0
        
        return {
            'total_transactions': sales_transactions.count(),
            'total_sales_amount': total_sales,
            'total_tax_amount': sales_transactions.aggregate(Sum('tax_amount'))['tax_amount__sum'] or 0,
            'cash_sales': payments.filter(payment_method='CASH').aggregate(Sum('amount'))['amount__sum'] or 0,
            'card_sales': payments.filter(payment_method='CARD').aggregate(Sum('amount'))['amount__sum'] or 0,
            'ecocash_sales': payments.filter(payment_method='ECOCASH').aggregate(Sum('amount'))['amount__sum'] or 0,
            'products_received': transactions.filter(status='RECEIVED').count(),
            'products_sold': transactions.filter(status='SOLD').count(),
            'products_to_collect': transactions.filter(status='PAID_TO_COLLECT').count(),
            'products_to_pay': transactions.filter(status='COLLECTED_TO_PAY').count(),
            'total_expenses': total_expenses,
            'total_losses': total_losses,
            'cost_of_goods_sold': cost_of_goods,
            'gross_profit': total_sales - cost_of_goods,
            'net_profit': total_sales - cost_of_goods - total_expenses - total_losses,
            'new_customers': Customer.objects.filter(date_created__date=date).count(),
            'payments_received': payments.filter(customer__isnull=False).aggregate(Sum('amount'))['amount__sum'] or 0,
        }


class ReportsAPIView(APIView):
    @extend_schema(description="Get various business reports")
    def get(self, request):
        report_type = request.query_params.get('type', 'daily')
        
        if report_type == 'daily':
            data = self.daily_sales_report()
        elif report_type == 'weekly':
            data = self.weekly_sales_report()
        elif report_type == 'monthly':
            data = self.monthly_sales_report()
        elif report_type == 'stock':
            data = self.stock_report()
        elif report_type == 'customers':
            data = self.customer_balance_report()
        elif report_type == 'resellers':
            data = self.reseller_commission_report()
        elif report_type == 'expenses':
            data = self.expenses_report()
        elif report_type == 'losses':
            data = self.losses_report()
        elif report_type == 'profit_loss':
            data = self.profit_loss_report()
        else:
            return Response({'error': 'Invalid report type'}, status=400)
        
        return Response(data)
    
    def daily_sales_report(self):
        from django.utils import timezone
        today = timezone.now().date()
        
        transactions = Transaction.objects.filter(
            timestamp__date=today,
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        
        return {
            'date': today,
            'total_transactions': transactions.count(),
            'total_amount': transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'total_tax': transactions.aggregate(Sum('tax_amount'))['tax_amount__sum'] or 0,
        }
    
    def weekly_sales_report(self):
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        week_start = today - timedelta(days=7)
        
        transactions = Transaction.objects.filter(
            timestamp__date__range=[week_start, today],
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        
        return {
            'start_date': week_start,
            'end_date': today,
            'total_transactions': transactions.count(),
            'total_amount': transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        }
    
    def monthly_sales_report(self):
        from django.utils import timezone
        
        now = timezone.now()
        transactions = Transaction.objects.filter(
            timestamp__year=now.year,
            timestamp__month=now.month,
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        
        return {
            'year': now.year,
            'month': now.month,
            'total_transactions': transactions.count(),
            'total_amount': transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        }
    
    def stock_report(self):
        products = Product.objects.filter(is_active=True)
        
        return {
            'total_products': products.count(),
            'low_stock_products': products.filter(stock_quantity__lte=F('low_stock_threshold')).count(),
            'out_of_stock_products': products.filter(stock_quantity=0).count(),
        }
    
    def customer_balance_report(self):
        customers = Customer.objects.filter(outstanding_balance__gt=0)
        
        return {
            'total_customers_with_balance': customers.count(),
            'total_outstanding': customers.aggregate(Sum('outstanding_balance'))['outstanding_balance__sum'] or 0,
        }
    
    def reseller_commission_report(self):
        resellers = Reseller.objects.filter(current_balance__gt=0)
        
        return {
            'total_resellers_owed': resellers.count(),
            'total_amount_owed': resellers.aggregate(Sum('current_balance'))['current_balance__sum'] or 0,
        }
    
    def expenses_report(self):
        from django.utils import timezone
        today = timezone.now().date()
        
        expenses = Expense.objects.filter(date__date=today)
        
        return {
            'total_expenses_today': expenses.aggregate(Sum('amount'))['amount__sum'] or 0,
            'expenses_by_type': expenses.values('expense_type').annotate(total=Sum('amount')),
        }
    
    def losses_report(self):
        from django.utils import timezone
        today = timezone.now().date()
        
        losses = Loss.objects.filter(date__date=today)
        
        return {
            'total_losses_today': losses.aggregate(Sum('total_loss_amount'))['total_loss_amount__sum'] or 0,
            'losses_by_type': losses.values('loss_type').annotate(total=Sum('total_loss_amount')),
        }
    
    def profit_loss_report(self):
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Get monthly data
        transactions = Transaction.objects.filter(
            timestamp__date__range=[month_start, today],
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        )
        
        # Calculate revenue excluding reseller markup
        business_revenue = 0
        cost_of_goods = 0
        for t in transactions:
            for item in t.items.all():
                if t.reseller:
                    # For reseller transactions, use product default price (not markup)
                    business_revenue += item.product.default_sale_price * item.quantity
                else:
                    # For direct sales, use full amount
                    business_revenue += item.unit_price * item.quantity
                cost_of_goods += item.product.cost_price_avg * item.quantity
        
        total_sales = business_revenue
        
        expenses = Expense.objects.filter(date__date__range=[month_start, today])
        total_expenses = expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        
        losses = Loss.objects.filter(date__date__range=[month_start, today])
        total_losses = losses.aggregate(Sum('total_loss_amount'))['total_loss_amount__sum'] or 0
        
        gross_profit = total_sales - cost_of_goods
        net_profit = gross_profit - total_expenses - total_losses
        profit_margin = (net_profit / total_sales * 100) if total_sales > 0 else 0
        
        return {
            'period': f'{month_start.strftime("%d %B %Y")} - {today.strftime("%d %B %Y")}',
            'total_sales': total_sales,
            'cost_of_goods_sold': cost_of_goods,
            'gross_profit': gross_profit,
            'total_expenses': total_expenses,
            'total_losses': total_losses,
            'net_profit': net_profit,
            'profit_margin_percentage': profit_margin,
        }


class PaymentCollectionViewSet(viewsets.ModelViewSet):
    queryset = PaymentCollection.objects.all()
    serializer_class = PaymentCollectionSerializer
    
    def perform_create(self, serializer):
        try:
            serializer.save(created_by=self.request.user)
        except Exception as e:
            logger.error(f"Error creating payment collection: {e}")
            raise
    
    @extend_schema(description="Mark as paid")
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        collection = self.get_object()
        collection.status = 'PAID'
        collection.save()
        
        # Update related transaction status if applicable
        if collection.transaction and collection.collection_type == 'CUSTOMER_DEBT':
            transaction = collection.transaction
            if transaction.status == 'COLLECTED_TO_PAY':
                transaction.status = 'SOLD'
                transaction.save()
        
        # Update customer outstanding balance
        if collection.customer and collection.collection_type == 'CUSTOMER_DEBT':
            customer = collection.customer
            customer.outstanding_balance = max(0, customer.outstanding_balance - collection.amount)
            customer.save()
        
        return Response({'status': 'marked as paid'})
    
    @extend_schema(description="Mark as collected")
    @action(detail=True, methods=['post'])
    def mark_collected(self, request, pk=None):
        collection = self.get_object()
        collection.status = 'COLLECTED'
        collection.save()
        
        # Update related transaction status if applicable
        if collection.transaction and collection.collection_type == 'ITEM_TO_COLLECT':
            transaction = collection.transaction
            if transaction.status == 'PAID_TO_COLLECT':
                transaction.status = 'SOLD'
                transaction.save()
        
        return Response({'status': 'marked as collected'})
    
    @extend_schema(description="Create test payment collections with real amounts")
    @action(detail=False, methods=['post'])
    def create_test_collections(self, request):
        from datetime import datetime, timedelta
        from decimal import Decimal
        
        created_collections = []
        
        # Get some customers and resellers
        customers = Customer.objects.all()[:3]
        resellers = Reseller.objects.all()[:2]
        
        # Create test customer debt
        if customers:
            for i, customer in enumerate(customers):
                collection = PaymentCollection.objects.create(
                    collection_type='CUSTOMER_DEBT',
                    customer=customer,
                    amount=Decimal('150.00') + (i * 50),
                    due_date=datetime.now().date() + timedelta(days=7 + i),
                    description=f'Outstanding payment for {customer.name}',
                    created_by=request.user
                )
                created_collections.append(collection.id)
        
        # Create test item to collect
        if customers:
            collection = PaymentCollection.objects.create(
                collection_type='ITEM_TO_COLLECT',
                customer=customers[0],
                amount=Decimal('75.00'),
                due_date=datetime.now().date() + timedelta(days=3),
                description=f'Solar panel to collect for {customers[0].name}',
                created_by=request.user
            )
            created_collections.append(collection.id)
        
        # Create test reseller payment
        if resellers:
            collection = PaymentCollection.objects.create(
                collection_type='RESELLER_PAYMENT',
                reseller=resellers[0],
                amount=Decimal('120.00'),
                due_date=datetime.now().date() + timedelta(days=14),
                description=f'Commission payment to {resellers[0].name}',
                created_by=request.user
            )
            created_collections.append(collection.id)
        
        return Response({
            'status': f'{len(created_collections)} test collections created',
            'collection_ids': created_collections
        })
    
    @extend_schema(description="Debug payment collections data")
    @action(detail=False, methods=['get'])
    def debug_data(self, request):
        collections = PaymentCollection.objects.all()[:5]
        debug_info = []
        
        for collection in collections:
            debug_info.append({
                'id': collection.id,
                'collection_type': collection.collection_type,
                'amount': str(collection.amount),
                'customer_id': collection.customer.id if collection.customer else None,
                'customer_name': collection.customer.name if collection.customer else None,
                'reseller_id': collection.reseller.id if collection.reseller else None,
                'reseller_name': collection.reseller.name if collection.reseller else None,
                'description': collection.description,
                'status': collection.status,
                'due_date': collection.due_date.isoformat() if collection.due_date else None,
                'created_by': collection.created_by.username if collection.created_by else None
            })
        
        return Response({
            'total_collections': PaymentCollection.objects.count(),
            'sample_data': debug_info,
            'customers_count': Customer.objects.count(),
            'resellers_count': Reseller.objects.count()
        })


class DashboardAPIView(APIView):
    @extend_schema(description="Get dashboard summary data")
    def get(self, request):
        from django.utils import timezone
        
        today = timezone.now().date()
        today_sales = Transaction.objects.filter(
            timestamp__date=today,
            status__in=['SOLD', 'PAID_TO_COLLECT', 'COLLECTED_TO_PAY']
        ).aggregate(total=Sum('total_amount'), count=Count('id'))
        
        dashboard_data = {
            'today_sales': today_sales,
            'low_stock_count': Product.objects.filter(stock_quantity__lte=F('low_stock_threshold')).count(),
            'pending_invoices': Invoice.objects.filter(status='PENDING').count(),
            'customers_with_balance': Customer.objects.filter(outstanding_balance__gt=0).count(),
            'unread_notifications': Notification.objects.filter(is_read=False).count(),
            'pending_collections': PaymentCollection.objects.filter(status='PENDING').count(),
        }
        
        return Response(dashboard_data)


class ReportScheduleViewSet(viewsets.ModelViewSet):
    queryset = ReportSchedule.objects.all()
    serializer_class = ReportScheduleSerializer
    
    def perform_create(self, serializer):
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        schedule = serializer.save(user=self.request.user)
        
        # Calculate next run time
        now = timezone.now()
        time_obj = schedule.time
        
        if schedule.frequency == 'daily':
            next_run = now.replace(hour=time_obj.hour, minute=time_obj.minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        elif schedule.frequency == 'weekly':
            next_run = now.replace(hour=time_obj.hour, minute=time_obj.minute, second=0, microsecond=0)
            days_ahead = 7 - now.weekday()
            if days_ahead <= 0 or (days_ahead == 7 and next_run <= now):
                days_ahead += 7
            next_run += timedelta(days=days_ahead)
        else:  # monthly
            next_run = now.replace(day=1, hour=time_obj.hour, minute=time_obj.minute, second=0, microsecond=0)
            if next_run <= now:
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
        
        schedule.next_run = next_run
        schedule.save()
    
    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        """Send report immediately"""
        from .services import EmailService
        
        schedule = self.get_object()
        success = EmailService.send_scheduled_report(schedule.id)
        
        if success:
            return Response({'status': 'Report sent successfully'})
        else:
            return Response({'error': 'Failed to send report'}, status=500)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle schedule active status"""
        schedule = self.get_object()
        schedule.is_active = not schedule.is_active
        schedule.save()
        
        return Response({'status': f'Schedule {"activated" if schedule.is_active else "deactivated"}'})