import django_filters

from .models import Operator


class OperatorFilter(django_filters.FilterSet):
    class Meta:
        model = Operator
        fields = {
            "status": ["exact"],
            "task_type": ["exact"],
            "dni": ["exact", "icontains"],
            "email": ["icontains"],
        }
