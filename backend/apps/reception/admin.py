from django.contrib import admin

from .models import ReceptionChecklistItem, ReceptionDamage, ReceptionInspectionItem, VehicleReception


class ReceptionChecklistItemInline(admin.TabularInline):
    model = ReceptionChecklistItem
    extra = 0


class ReceptionInspectionItemInline(admin.TabularInline):
    model = ReceptionInspectionItem
    extra = 0


class ReceptionDamageInline(admin.TabularInline):
    model = ReceptionDamage
    extra = 0


@admin.register(VehicleReception)
class VehicleReceptionAdmin(admin.ModelAdmin):
    list_display = ("reception_number", "vehicle", "client", "status", "source", "received_at")
    list_filter = ("status", "source", "received_at")
    search_fields = ("reception_number", "vehicle__plate", "client__first_name", "client__last_name")
    inlines = [ReceptionChecklistItemInline, ReceptionInspectionItemInline, ReceptionDamageInline]


@admin.register(ReceptionDamage)
class ReceptionDamageAdmin(admin.ModelAdmin):
    list_display = ("reception", "zone", "part_name", "severity", "action_required", "source", "created_at")
    list_filter = ("zone", "severity", "action_required", "source")
