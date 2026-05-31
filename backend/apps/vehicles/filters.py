import django_filters

from apps.core.utils import normalize_plate

from .models import Vehicle


class VehicleFilter(django_filters.FilterSet):
    plate = django_filters.CharFilter(method="filter_plate")

    class Meta:
        model = Vehicle
        fields = {
            "client": ["exact"],
            "status": ["exact"],
            "brand": ["exact", "icontains"],
            "model": ["icontains"],
            "year": ["exact"],
        }

    def filter_plate(self, queryset, name, value):
        normalized = normalize_plate(value)
        if not normalized:
            return queryset
        return queryset.filter(plate_normalized__icontains=normalized)

