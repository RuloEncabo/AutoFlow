from __future__ import annotations

from rest_framework import serializers

from .models import ChatbotConfig, ChatbotInteraction


class ChatbotHistoryMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("user", "assistant"))
    content = serializers.CharField(trim_whitespace=True, allow_blank=False, max_length=8000)


class ChatbotMessageSerializer(serializers.Serializer):
    session_id = serializers.CharField(required=False, allow_blank=True, max_length=120)
    message = serializers.CharField(trim_whitespace=True, allow_blank=False, max_length=8000)
    history = ChatbotHistoryMessageSerializer(many=True, required=False)
    pending_action = serializers.JSONField(required=False, allow_null=True)
    confirmed = serializers.BooleanField(required=False, default=False)


class ChatbotResponseMessageSerializer(serializers.Serializer):
    role = serializers.CharField()
    content = serializers.CharField()


class ChatbotMessageResponseSerializer(serializers.Serializer):
    session_id = serializers.CharField()
    message = ChatbotResponseMessageSerializer()
    rich_content = serializers.ListField(child=serializers.DictField(), required=False)
    tools_used = serializers.ListField(child=serializers.CharField(), required=False)
    requires_confirmation = serializers.BooleanField(default=False)
    pending_action = serializers.JSONField(required=False, allow_null=True)


class ChatbotInteractionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = ChatbotInteraction
        fields = (
            "id",
            "user",
            "user_email",
            "session_id",
            "role",
            "content",
            "tools_used",
            "tokens_used",
            "response_time_ms",
            "metadata",
            "created_at",
        )
        read_only_fields = fields


class ChatbotConfigSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.CharField(source="updated_by.email", read_only=True)

    class Meta:
        model = ChatbotConfig
        fields = (
            "id",
            "model_name",
            "system_prompt",
            "max_tokens",
            "temperature",
            "enabled_tools",
            "is_active",
            "updated_by",
            "updated_by_email",
            "updated_at",
        )
        read_only_fields = ("id", "updated_by", "updated_by_email", "updated_at")
