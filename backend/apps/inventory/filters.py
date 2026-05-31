import django_filters
from django.db import models

from .models import InventoryFamily, Material, Part, WorkOrderMaterial, WorkOrderPart


class InventoryFamilyFilter(django_filters.FilterSet):
    class Meta:
        model = InventoryFamily
        fields = {"status": ["exact"], "name": ["icontains"]}


class PartFilter(django_filters.FilterSet):
    critical = django_filters.BooleanFilter(method="filter_critical")

    class Meta:
        model = Part
        fields = {
            "family": ["exact"],
            "status": ["exact"],
            "code": ["icontains"],
            "supplier_code": ["icontains"],
            "barcode": ["exact", "icontains"],
            "qr_code": ["exact", "icontains"],
            "name": ["icontains"],
        }

    def filter_critical(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(stock__lte=models.F("min_stock"))


class MaterialFilter(django_filters.FilterSet):
    critical = django_filters.BooleanFilter(method="filter_critical")

    class Meta:
        model = Material
        fields = {
            "family": ["exact"],
            "status": ["exact"],
            "type": ["exact", "icontains"],
            "code": ["icontains"],
            "supplier_code": ["icontains"],
            "barcode": ["exact", "icontains"],
            "qr_code": ["exact", "icontains"],
            "name": ["icontains"],
        }

    def filter_critical(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(stock__lte=models.F("min_stock"))


class WorkOrderPartFilter(django_filters.FilterSet):
    class Meta:
        model = WorkOrderPart
        fields = {"work_order": ["exact"], "part": ["exact"], "status": ["exact"]}


class WorkOrderMaterialFilter(django_filters.FilterSet):
    class Meta:
        model = WorkOrderMaterial
        fields = {"work_order": ["exact"], "material": ["exact"], "status": ["exact"]}
