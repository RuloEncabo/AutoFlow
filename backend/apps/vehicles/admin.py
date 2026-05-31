from django.contrib import admin

from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("plate", "brand", "model", "client", "year", "status")
    list_filter = ("status", "brand", "created_at")
    search_fields = ("plate", "plate_normalized", "brand", "model", "vin", "client__first_name", "client__last_name")
    readonly_fields = ("plate_normalized", "created_at", "updated_at", "deleted_at")

