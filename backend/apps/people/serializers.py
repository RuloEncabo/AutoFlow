from rest_framework import serializers

from .models import Operator


class OperatorSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Operator
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "dni",
            "address",
            "phone",
            "email",
            "marital_status",
            "task_type",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "full_name", "created_at", "updated_at")

    def validate(self, attrs):
        required_fields = (
            ("first_name", "El nombre es obligatorio."),
            ("last_name", "El apellido es obligatorio."),
            ("dni", "El DNI es obligatorio."),
            ("address", "La direccion es obligatoria."),
            ("phone", "El telefono es obligatorio."),
            ("task_type", "El tipo de tarea es obligatorio."),
        )
        for field, message in required_fields:
            value = attrs.get(field, getattr(self.instance, field, ""))
            if isinstance(value, str) and not value.strip():
                raise serializers.ValidationError({field: message})
            if value is None:
                raise serializers.ValidationError({field: message})
        return attrs
