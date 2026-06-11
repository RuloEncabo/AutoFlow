from django.contrib import admin

from .models import ChatbotConfig, ChatbotInteraction


@admin.register(ChatbotInteraction)
class ChatbotInteractionAdmin(admin.ModelAdmin):
    list_display = ("session_id", "user", "role", "tokens_used", "response_time_ms", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("session_id", "user__email", "content")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)


@admin.register(ChatbotConfig)
class ChatbotConfigAdmin(admin.ModelAdmin):
    list_display = ("model_name", "is_active", "updated_by", "updated_at")
    list_filter = ("is_active", "model_name")
    search_fields = ("model_name", "system_prompt")
    readonly_fields = ("id", "updated_at")
