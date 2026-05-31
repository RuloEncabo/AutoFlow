from django.contrib import admin

from .models import InventoryFamily, Material, Part, StockMovement, WorkOrderMaterial, WorkOrderPart


@admin.register(InventoryFamily)
class InventoryFamilyAdmin(admin.ModelAdmin):
    list_display = ("name", "status")
    list_filter = ("status", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ("code", "supplier_code", "name", "family", "stock", "min_stock", "cost", "status")
    list_filter = ("family", "status", "created_at")
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "description")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("code", "supplier_code", "name", "family", "type", "stock", "min_stock", "cost", "status")
    list_filter = ("family", "status", "type", "created_at")
    search_fields = ("code", "supplier_code", "barcode", "qr_code", "name", "type", "description")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


admin.site.register(WorkOrderPart)
admin.site.register(WorkOrderMaterial)
admin.site.register(StockMovement)
