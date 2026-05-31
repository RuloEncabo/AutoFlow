from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EstimateViewSet, InvoiceViewSet, MercadoPagoPaymentViewSet, MercadoPagoWebhookView, PaymentViewSet

router = DefaultRouter()
router.register("estimates", EstimateViewSet, basename="estimates")
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("mercadopago-payments", MercadoPagoPaymentViewSet, basename="mercadopago-payments")
router.register("payments", PaymentViewSet, basename="payments")

app_name = "billing"

urlpatterns = [
    path("mercadopago/webhook/", MercadoPagoWebhookView.as_view(), name="mercadopago-webhook"),
    path("", include(router.urls)),
]
