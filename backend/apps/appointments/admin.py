from django.contrib import admin

from .models import Appointment, AppointmentCommunication


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("scheduled_at", "client", "vehicle", "status", "created_by")
    list_filter = ("status", "scheduled_at", "created_at")
    search_fields = (
        "client__first_name",
        "client__last_name",
        "client__document",
        "vehicle__plate",
        "vehicle__plate_normalized",
    )
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(AppointmentCommunication)
class AppointmentCommunicationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "appointment", "channel", "recipient", "status", "sent_at")
    list_filter = ("channel", "status", "created_at", "sent_at")
    search_fields = ("recipient", "message", "error_message")
    readonly_fields = ("created_at", "sent_at")

