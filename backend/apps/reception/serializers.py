from rest_framework import serializers

from .models import ReceptionChecklistItem, ReceptionDamage, ReceptionInspectionItem, VehicleReception


class ReceptionChecklistItemSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ReceptionChecklistItem
        fields = ("id", "section", "code", "label", "status", "status_label", "notes")
        read_only_fields = ("id", "status_label")


class ReceptionInspectionItemSerializer(serializers.ModelSerializer):
    result_label = serializers.CharField(source="get_result_display", read_only=True)

    class Meta:
        model = ReceptionInspectionItem
        fields = ("id", "section", "code", "label", "result", "result_label", "notes")
        read_only_fields = ("id", "result_label")


class ReceptionDamageSerializer(serializers.ModelSerializer):
    zone_label = serializers.CharField(source="get_zone_display", read_only=True)
    severity_label = serializers.CharField(source="get_severity_display", read_only=True)
    action_required_label = serializers.CharField(source="get_action_required_display", read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = ReceptionDamage
        fields = (
            "id",
            "reception",
            "zone",
            "zone_label",
            "part_name",
            "damage_type",
            "severity",
            "severity_label",
            "action_required",
            "action_required_label",
            "description",
            "photo",
            "photo_url",
            "source",
            "created_by",
            "created_at",
        )
        read_only_fields = (
            "id",
            "zone_label",
            "severity_label",
            "action_required_label",
            "photo_url",
            "created_by",
            "created_at",
        )

    def get_photo_url(self, obj):
        if not obj.photo:
            return ""
        request = self.context.get("request")
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url

    def validate(self, attrs):
        description = attrs.get("description", getattr(self.instance, "description", ""))
        part_name = attrs.get("part_name", getattr(self.instance, "part_name", ""))
        damage_type = attrs.get("damage_type", getattr(self.instance, "damage_type", ""))
        if not any(str(value).strip() for value in [description, part_name, damage_type]):
            raise serializers.ValidationError({"description": "Debe indicar el dano, pieza o descripcion."})
        return attrs


class VehicleReceptionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    plate = serializers.CharField(source="vehicle.plate", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    source_label = serializers.CharField(source="get_source_display", read_only=True)
    work_order_number = serializers.CharField(source="work_order.order_number", read_only=True)
    checklist_items = ReceptionChecklistItemSerializer(many=True, required=False)
    inspection_items = ReceptionInspectionItemSerializer(many=True, required=False)
    damages = ReceptionDamageSerializer(many=True, read_only=True)
    checklist_problem_count = serializers.SerializerMethodField()
    immediate_attention_count = serializers.SerializerMethodField()
    damage_count = serializers.SerializerMethodField()

    class Meta:
        model = VehicleReception
        fields = (
            "id",
            "reception_number",
            "client",
            "client_name",
            "vehicle",
            "vehicle_label",
            "plate",
            "work_order",
            "work_order_number",
            "received_at",
            "driver_name",
            "driver_phone",
            "driver_document",
            "odometer_km",
            "fuel_level",
            "status",
            "status_label",
            "source",
            "source_label",
            "mobile_device_id",
            "notes",
            "checklist_items",
            "inspection_items",
            "damages",
            "checklist_problem_count",
            "immediate_attention_count",
            "damage_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reception_number",
            "client_name",
            "vehicle_label",
            "plate",
            "work_order_number",
            "status_label",
            "source_label",
            "damages",
            "checklist_problem_count",
            "immediate_attention_count",
            "damage_count",
            "created_at",
            "updated_at",
        )

    def get_vehicle_label(self, obj):
        return f"{obj.vehicle.plate} - {obj.vehicle.brand} {obj.vehicle.model}"

    def get_checklist_problem_count(self, obj):
        return obj.checklist_items.filter(status="problem").count()

    def get_immediate_attention_count(self, obj):
        return obj.inspection_items.filter(result="immediate_attention").count()

    def get_damage_count(self, obj):
        return obj.damages.count()

    def validate(self, attrs):
        client = attrs.get("client", getattr(self.instance, "client", None))
        vehicle = attrs.get("vehicle", getattr(self.instance, "vehicle", None))
        work_order = attrs.get("work_order", getattr(self.instance, "work_order", None))
        if client and vehicle and vehicle.client_id != client.id:
            raise serializers.ValidationError({"vehicle": "El vehiculo no pertenece al cliente seleccionado."})
        if work_order:
            if client and work_order.client_id != client.id:
                raise serializers.ValidationError({"work_order": "La orden no pertenece al cliente seleccionado."})
            if vehicle and work_order.vehicle_id != vehicle.id:
                raise serializers.ValidationError({"work_order": "La orden no pertenece al vehiculo seleccionado."})
        fuel_level = attrs.get("fuel_level", getattr(self.instance, "fuel_level", 0))
        if fuel_level < 0 or fuel_level > 100:
            raise serializers.ValidationError({"fuel_level": "El combustible debe estar entre 0 y 100."})
        return attrs

    def _replace_children(self, instance, validated_data):
        checklist_items = validated_data.pop("checklist_items", None)
        inspection_items = validated_data.pop("inspection_items", None)
        if checklist_items is not None:
            instance.checklist_items.all().delete()
            ReceptionChecklistItem.objects.bulk_create(
                [ReceptionChecklistItem(reception=instance, **item) for item in checklist_items]
            )
        if inspection_items is not None:
            instance.inspection_items.all().delete()
            ReceptionInspectionItem.objects.bulk_create(
                [ReceptionInspectionItem(reception=instance, **item) for item in inspection_items]
            )

    def create(self, validated_data):
        checklist_items = validated_data.pop("checklist_items", [])
        inspection_items = validated_data.pop("inspection_items", [])
        instance = VehicleReception.objects.create(**validated_data)
        self._replace_children(instance, {"checklist_items": checklist_items, "inspection_items": inspection_items})
        return instance

    def update(self, instance, validated_data):
        checklist_items = validated_data.pop("checklist_items", None)
        inspection_items = validated_data.pop("inspection_items", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        self._replace_children(instance, {"checklist_items": checklist_items, "inspection_items": inspection_items})
        return instance
