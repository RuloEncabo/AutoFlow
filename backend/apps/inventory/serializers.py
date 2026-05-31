from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import InventoryFamily, Material, MovementType, Part, StockMovement, WorkOrderMaterial, WorkOrderPart


class StockAdjustmentSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"))
    movement_type = serializers.ChoiceField(choices=MovementType.choices, default=MovementType.ADJUSTMENT)
    reason = serializers.CharField(required=False, allow_blank=True)


class InventoryFamilySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryFamily
        fields = ("id", "name", "description", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de la familia es obligatorio.")
        return value


class ScanLookupSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=255)


class PartSerializer(serializers.ModelSerializer):
    is_critical = serializers.SerializerMethodField()
    family_name = serializers.CharField(source="family.name", read_only=True)

    class Meta:
        model = Part
        fields = (
            "id",
            "family",
            "family_name",
            "code",
            "supplier_code",
            "barcode",
            "qr_code",
            "name",
            "description",
            "stock",
            "min_stock",
            "cost",
            "status",
            "is_critical",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "family_name", "is_critical", "created_at", "updated_at")

    def get_is_critical(self, obj):
        return obj.stock <= obj.min_stock


class MaterialSerializer(serializers.ModelSerializer):
    is_critical = serializers.SerializerMethodField()
    family_name = serializers.CharField(source="family.name", read_only=True)

    class Meta:
        model = Material
        fields = (
            "id",
            "family",
            "family_name",
            "code",
            "supplier_code",
            "barcode",
            "qr_code",
            "name",
            "type",
            "description",
            "stock",
            "min_stock",
            "cost",
            "status",
            "is_critical",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "family_name", "is_critical", "created_at", "updated_at")

    def get_is_critical(self, obj):
        return obj.stock <= obj.min_stock


class WorkOrderPartSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source="part.name", read_only=True)
    part_code = serializers.CharField(source="part.code", read_only=True)

    class Meta:
        model = WorkOrderPart
        fields = ("id", "work_order", "part", "part_code", "part_name", "quantity", "unit_cost", "total_cost", "status", "notes", "created_at")
        read_only_fields = ("id", "part_code", "part_name", "total_cost", "created_at")

    def create(self, validated_data):
        with transaction.atomic():
            item = super().create(validated_data)
            if item.status in {"reserved", "used"}:
                part = item.part
                if part.stock < item.quantity:
                    raise serializers.ValidationError({"quantity": "Stock insuficiente."})
                part.stock -= item.quantity
                part.save(update_fields=["stock", "updated_at"])
                StockMovement.objects.create(item_type="part", part=part, movement_type=MovementType.OUT, quantity=item.quantity, work_order=item.work_order, created_by=item.created_by, reason="Consumo por orden")
            return item


class WorkOrderMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_code = serializers.CharField(source="material.code", read_only=True)

    class Meta:
        model = WorkOrderMaterial
        fields = ("id", "work_order", "material", "material_code", "material_name", "quantity", "unit_cost", "total_cost", "status", "notes", "created_at")
        read_only_fields = ("id", "material_code", "material_name", "total_cost", "created_at")

    def create(self, validated_data):
        with transaction.atomic():
            item = super().create(validated_data)
            if item.status in {"reserved", "used"}:
                material = item.material
                if material.stock < item.quantity:
                    raise serializers.ValidationError({"quantity": "Stock insuficiente."})
                material.stock -= item.quantity
                material.save(update_fields=["stock", "updated_at"])
                StockMovement.objects.create(item_type="material", material=material, movement_type=MovementType.OUT, quantity=item.quantity, work_order=item.work_order, created_by=item.created_by, reason="Consumo por orden")
            return item
