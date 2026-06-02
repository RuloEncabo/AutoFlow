from django.contrib import admin

from .models import TaskTemplate, WorkOrder, WorkOrderStatusHistory, WorkOrderTask


@admin.register(TaskTemplate)
class TaskTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "estimated_minutes", "labor_cost", "status")
    list_filter = ("status", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "client", "vehicle", "status", "priority", "entry_date")
    list_filter = ("status", "priority", "entry_date", "created_at")
    search_fields = ("order_number", "client__first_name", "client__last_name", "vehicle__plate")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(WorkOrderTask)
class WorkOrderTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "work_order", "operator", "status", "priority", "sector", "estimated_minutes", "labor_cost")
    list_filter = ("status", "priority", "sector", "operator", "created_at")
    search_fields = ("title", "description", "operator__first_name", "operator__last_name", "work_order__order_number")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(WorkOrderStatusHistory)
class WorkOrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "work_order", "old_status", "new_status", "changed_by")
    list_filter = ("new_status", "created_at")
    search_fields = ("work_order__order_number", "notes")
    readonly_fields = [field.name for field in WorkOrderStatusHistory._meta.fields]
