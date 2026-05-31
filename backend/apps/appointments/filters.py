import django_filters

from .models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    scheduled_from = django_filters.IsoDateTimeFilter(field_name="scheduled_at", lookup_expr="gte")
    scheduled_to = django_filters.IsoDateTimeFilter(field_name="scheduled_at", lookup_expr="lte")
    date = django_filters.DateFilter(field_name="scheduled_at", lookup_expr="date")

    class Meta:
        model = Appointment
        fields = {
            "client": ["exact"],
            "vehicle": ["exact"],
            "status": ["exact"],
        }

