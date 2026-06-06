import django_filters

from .models import TaskTemplate, WorkOrder, WorkOrderTask


class TaskTemplateFilter(django_filters.FilterSet):
    class Meta:
        model = TaskTemplate
        fields = {
            "status": ["exact"],
            "name": ["icontains"],
        }


class WorkOrderFilter(django_filters.FilterSet):
    delayed = django_filters.BooleanFilter(method="filter_delayed")
    is_closed = django_filters.BooleanFilter(method="filter_is_closed")
    estimated_delivery_from = django_filters.DateFilter(field_name="estimated_delivery_date", lookup_expr="gte")
    estimated_delivery_to = django_filters.DateFilter(field_name="estimated_delivery_date", lookup_expr="lte")

    class Meta:
        model = WorkOrder
        fields = {
            "client": ["exact"],
            "vehicle": ["exact"],
            "status": ["exact"],
            "priority": ["exact"],
        }

    def filter_delayed(self, queryset, name, value):
        from django.utils import timezone

        if not value:
            return queryset
        return queryset.filter(
            estimated_delivery_date__lt=timezone.now().date(),
        ).exclude(status__in=["delivered", "closed", "cancelled"])

    def filter_is_closed(self, queryset, name, value):
        if value:
            return queryset.filter(status="closed")
        return queryset.exclude(status="closed")


class WorkOrderTaskFilter(django_filters.FilterSet):
    class Meta:
        model = WorkOrderTask
        fields = {
            "work_order": ["exact"],
            "status": ["exact"],
            "priority": ["exact"],
            "sector": ["exact", "icontains"],
            "responsible": ["exact"],
            "operator": ["exact"],
            "task_template": ["exact"],
        }
