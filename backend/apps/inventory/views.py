from django.db import transaction
from django.db.models import F, Q
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.excel import build_workbook, excel_response, query_bool
from apps.core.permissions import IsInventoryRole, IsWorkOrderInventoryUsageRole
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


def _display(instance, field):
    method = getattr(instance, f"get_{field}_display", None)
    if callable(method):
        return method()
    return getattr(instance, field, "")


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
    permission_classes = [IsInventoryRole]
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
    permission_classes = [IsInventoryRole]
    filterset_class = PartFilter
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "description", "family__name")
    ordering_fields = ("code", "supplier_code", "name", "stock", "min_stock", "cost", "created_at")
    ordering = ("code",)

    def get_queryset(self):
        return Part.objects.select_related("family")

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        if query_bool(request):
            headers = [
                "Codigo",
                "Cod proveedor",
                "Repuesto",
                "Familia",
                "Orden",
                "Cliente",
                "Patente",
                "Cantidad",
                "Costo unitario",
                "Total",
                "Estado consumo",
                "Fecha",
            ]
            usages = WorkOrderPart.objects.select_related(
                "part",
                "part__family",
                "work_order",
                "work_order__client",
                "work_order__vehicle",
            ).filter(part__in=queryset)
            rows = [
                [
                    item.part.code,
                    item.part.supplier_code,
                    item.part.name,
                    item.part.family.name if item.part.family else "",
                    item.work_order.order_number,
                    item.work_order.client.full_name,
                    item.work_order.vehicle.plate,
                    item.quantity,
                    item.unit_cost,
                    item.total_cost,
                    _display(item, "status"),
                    item.created_at,
                ]
                for item in usages
            ]
            workbook = build_workbook("Repuestos con items", headers, rows)
            return excel_response(workbook, "repuestos_con_items")

        headers = ["Codigo", "Cod proveedor", "Codigo barra", "Codigo QR", "Repuesto", "Familia", "Stock", "Stock minimo", "Costo", "Estado", "Critico"]
        rows = [
            [
                part.code,
                part.supplier_code,
                part.barcode,
                part.qr_code,
                part.name,
                part.family.name if part.family else "",
                part.stock,
                part.min_stock,
                part.cost,
                _display(part, "status"),
                "Si" if part.stock <= part.min_stock else "No",
            ]
            for part in queryset
        ]
        workbook = build_workbook("Repuestos", headers, rows)
        return excel_response(workbook, "repuestos")


class MaterialViewSet(StockAdjustmentMixin, AuditModelViewSet):
    audit_module = "inventory_materials"
    item_type = "material"
    serializer_class = MaterialSerializer
    permission_classes = [IsInventoryRole]
    filterset_class = MaterialFilter
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "type", "description", "family__name")
    ordering_fields = ("code", "supplier_code", "name", "type", "stock", "min_stock", "cost", "created_at")
    ordering = ("code",)

    def get_queryset(self):
        return Material.objects.select_related("family")

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        if query_bool(request):
            headers = [
                "Codigo",
                "Cod proveedor",
                "Material",
                "Tipo",
                "Familia",
                "Orden",
                "Cliente",
                "Patente",
                "Cantidad",
                "Costo unitario",
                "Total",
                "Estado consumo",
                "Fecha",
            ]
            usages = WorkOrderMaterial.objects.select_related(
                "material",
                "material__family",
                "work_order",
                "work_order__client",
                "work_order__vehicle",
            ).filter(material__in=queryset)
            rows = [
                [
                    item.material.code,
                    item.material.supplier_code,
                    item.material.name,
                    item.material.type,
                    item.material.family.name if item.material.family else "",
                    item.work_order.order_number,
                    item.work_order.client.full_name,
                    item.work_order.vehicle.plate,
                    item.quantity,
                    item.unit_cost,
                    item.total_cost,
                    _display(item, "status"),
                    item.created_at,
                ]
                for item in usages
            ]
            workbook = build_workbook("Materiales con items", headers, rows)
            return excel_response(workbook, "materiales_con_items")

        headers = ["Codigo", "Cod proveedor", "Codigo barra", "Codigo QR", "Material", "Tipo", "Familia", "Stock", "Stock minimo", "Costo", "Estado", "Critico"]
        rows = [
            [
                material.code,
                material.supplier_code,
                material.barcode,
                material.qr_code,
                material.name,
                material.type,
                material.family.name if material.family else "",
                material.stock,
                material.min_stock,
                material.cost,
                _display(material, "status"),
                "Si" if material.stock <= material.min_stock else "No",
            ]
            for material in queryset
        ]
        workbook = build_workbook("Materiales", headers, rows)
        return excel_response(workbook, "materiales")


class WorkOrderPartViewSet(AuditModelViewSet):
    audit_module = "work_order_parts"
    serializer_class = WorkOrderPartSerializer
    permission_classes = [IsWorkOrderInventoryUsageRole]
    filterset_class = WorkOrderPartFilter

    def get_queryset(self):
        return WorkOrderPart.objects.select_related("work_order", "part")


class WorkOrderMaterialViewSet(AuditModelViewSet):
    audit_module = "work_order_materials"
    serializer_class = WorkOrderMaterialSerializer
    permission_classes = [IsWorkOrderInventoryUsageRole]
    filterset_class = WorkOrderMaterialFilter

    def get_queryset(self):
        return WorkOrderMaterial.objects.select_related("work_order", "material")
