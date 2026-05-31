from django.db import transaction
from django.db.models import F, Q
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.permissions import IsAuthenticatedAndAdminForDelete
from apps.core.viewsets import AuditModelViewSet

from .filters import InventoryFamilyFilter, MaterialFilter, PartFilter, WorkOrderMaterialFilter, WorkOrderPartFilter
from .models import InventoryFamily, Material, MovementType, Part, StockMovement, WorkOrderMaterial, WorkOrderPart
from .serializers import (
    InventoryFamilySerializer,
    MaterialSerializer,
    PartSerializer,
    ScanLookupSerializer,
    StockAdjustmentSerializer,
    WorkOrderMaterialSerializer,
    WorkOrderPartSerializer,
)


class StockAdjustmentMixin:
    @action(detail=True, methods=["post"], url_path="stock-movement")
    def stock_movement(self, request, pk=None):
        instance = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]
        movement_type = serializer.validated_data["movement_type"]

        with transaction.atomic():
            if movement_type in {MovementType.IN, MovementType.RETURN}:
                instance.stock += quantity
            elif movement_type == MovementType.OUT:
                if instance.stock < quantity:
                    raise ValidationError({"quantity": "Stock insuficiente."})
                instance.stock -= quantity
            else:
                instance.stock = quantity
            instance.updated_by = request.user
            instance.save(update_fields=["stock", "updated_by", "updated_at"])
            StockMovement.objects.create(
                item_type=self.item_type,
                part=instance if self.item_type == "part" else None,
                material=instance if self.item_type == "material" else None,
                movement_type=movement_type,
                quantity=quantity,
                reason=serializer.validated_data.get("reason", ""),
                created_by=request.user,
            )
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["get"], url_path="critical-stock")
    def critical_stock(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(stock__lte=F("min_stock"))
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get", "post"], url_path="scan-lookup")
    def scan_lookup(self, request):
        raw_code = request.query_params.get("code") if request.method == "GET" else request.data.get("code")
        serializer = ScanLookupSerializer(data={"code": raw_code})
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"].strip()
        queryset = self.get_queryset().filter(
            Q(code__iexact=code)
            | Q(supplier_code__iexact=code)
            | Q(barcode__iexact=code)
            | Q(qr_code__iexact=code)
        )
        instance = queryset.first()
        if not instance:
            raise ValidationError({"code": "No existe un item activo con ese codigo."})
        return Response(self.get_serializer(instance).data)


class InventoryFamilyViewSet(AuditModelViewSet):
    audit_module = "inventory_families"
    serializer_class = InventoryFamilySerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = InventoryFamilyFilter
    search_fields = ("name", "description")
    ordering_fields = ("name", "status", "created_at")
    ordering = ("name",)

    def get_queryset(self):
        return InventoryFamily.objects.all()


class PartViewSet(StockAdjustmentMixin, AuditModelViewSet):
    audit_module = "inventory_parts"
    item_type = "part"
    serializer_class = PartSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = PartFilter
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "description", "family__name")
    ordering_fields = ("code", "supplier_code", "name", "stock", "min_stock", "cost", "created_at")
    ordering = ("code",)

    def get_queryset(self):
        return Part.objects.select_related("family")


class MaterialViewSet(StockAdjustmentMixin, AuditModelViewSet):
    audit_module = "inventory_materials"
    item_type = "material"
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = MaterialFilter
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "type", "description", "family__name")
    ordering_fields = ("code", "supplier_code", "name", "type", "stock", "min_stock", "cost", "created_at")
    ordering = ("code",)

    def get_queryset(self):
        return Material.objects.select_related("family")


class WorkOrderPartViewSet(AuditModelViewSet):
    audit_module = "work_order_parts"
    serializer_class = WorkOrderPartSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = WorkOrderPartFilter

    def get_queryset(self):
        return WorkOrderPart.objects.select_related("work_order", "part")


class WorkOrderMaterialViewSet(AuditModelViewSet):
    audit_module = "work_order_materials"
    serializer_class = WorkOrderMaterialSerializer
    permission_classes = [IsAuthenticatedAndAdminForDelete]
    filterset_class = WorkOrderMaterialFilter

    def get_queryset(self):
        return WorkOrderMaterial.objects.select_related("work_order", "material")
