import django_filters

from .models import Client


class ClientFilter(django_filters.FilterSet):
    class Meta:
        model = Client
        fields = {
            "status": ["exact"],
            "city": ["exact", "icontains"],
            "document": ["exact", "icontains"],
            "email": ["icontains"],
        }

