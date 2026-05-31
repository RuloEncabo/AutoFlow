from django.contrib import admin

from .models import Operator


@admin.register(Operator)
class OperatorAdmin(admin.ModelAdmin):
    list_display = ("full_name", "dni", "task_type", "phone", "email", "status")
    list_filter = ("task_type", "status", "marital_status")
    search_fields = ("first_name", "last_name", "dni", "phone", "email")
