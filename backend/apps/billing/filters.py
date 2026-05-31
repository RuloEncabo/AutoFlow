import django_filters

from .models import Estimate, Invoice, Payment


class EstimateFilter(django_filters.FilterSet):
    class Meta:
        model = Estimate
        fields = {"work_order": ["exact"], "status": ["exact"]}


class InvoiceFilter(django_filters.FilterSet):
    issued_from = django_filters.DateFilter(field_name="issued_at", lookup_expr="date__gte")
    issued_to = django_filters.DateFilter(field_name="issued_at", lookup_expr="date__lte")

    class Meta:
        model = Invoice
        fields = {"work_order": ["exact"], "payment_status": ["exact"]}


class PaymentFilter(django_filters.FilterSet):
    class Meta:
        model = Payment
        fields = {"invoice": ["exact"], "method": ["exact"]}

