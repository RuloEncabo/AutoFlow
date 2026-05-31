from django.contrib import admin

from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "document", "phone", "email", "city", "status")
    list_filter = ("status", "city", "created_at")
    search_fields = ("first_name", "last_name", "document", "phone", "email")
    readonly_fields = ("created_at", "updated_at", "deleted_at")

