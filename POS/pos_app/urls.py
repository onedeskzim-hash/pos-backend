from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, auth_views

router = DefaultRouter()
router.register(r'business-profile', views.BusinessProfileViewSet)
router.register(r'staff-profiles', views.StaffProfileViewSet)
router.register(r'auth/users', views.UserViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'customers', views.CustomerViewSet)
router.register(r'resellers', views.ResellerViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'reseller-sales', views.ResellerSaleViewSet)
router.register(r'invoices', views.InvoiceViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'stock-movements', views.StockMovementViewSet)
router.register(r'stock-takes', views.StockTakeViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'cash-drawers', views.CashDrawerViewSet)
router.register(r'receipts', views.ReceiptViewSet)
router.register(r'expense-categories', views.ExpenseCategoryViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'losses', views.LossViewSet)
router.register(r'profit-loss-reports', views.ProfitLossReportViewSet)
router.register(r'daily-summaries', views.DailySummaryViewSet)
router.register(r'payment-collections', views.PaymentCollectionViewSet)
router.register(r'report-schedules', views.ReportScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('reports/', views.ReportsAPIView.as_view(), name='reports'),
    path('dashboard/', views.DashboardAPIView.as_view(), name='dashboard'),
    # Authentication endpoints
    path('auth/login/', auth_views.login_view, name='login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/user/', auth_views.user_view, name='user'),
]