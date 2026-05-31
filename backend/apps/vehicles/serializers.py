from rest_framework import serializers

from apps.core.utils import normalize_plate

from .models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            "id",
            "client",
            "client_name",
            "brand",
            "model",
            "plate",
            "plate_normalized",
            "year",
            "color",
            "vin",
            "notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "client_name", "plate_normalized", "created_at", "updated_at")

    def validate_plate(self, value):
        normalized = normalize_plate(value)
        if not normalized:
            raise serializers.ValidationError("La patente es obligatoria.")

        queryset = Vehicle.all_objects.filter(
            plate_normalized=normalized,
            deleted_at__isnull=True,
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un vehiculo activo con esa patente.")
        return value.strip().upper()

    def validate_year(self, value):
        if value is not None and (value < 1900 or value > 2100):
            raise serializers.ValidationError("El anio debe estar entre 1900 y 2100.")
        return value

    def validate(self, attrs):
        for field, label in (("brand", "La marca"), ("model", "El modelo")):
            value = attrs.get(field, getattr(self.instance, field, "")).strip()
            if not value:
                raise serializers.ValidationError({field: f"{label} es obligatorio."})
        return attrs


class VehicleStatusSerializer(serializers.Serializer):
    vehicle = serializers.DictField()
    active_work_order = serializers.JSONField(allow_null=True)
    progress_percent = serializers.IntegerField()
    tasks_pending = serializers.IntegerField()
    tasks_completed = serializers.IntegerField()
    history_summary = serializers.ListField(child=serializers.DictField())
