from rest_framework import serializers

from .models import WorkshopProfile


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    app = serializers.CharField()
    version = serializers.CharField()


class WorkshopProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    clear_smtp_password = serializers.BooleanField(write_only=True, required=False, default=False)
    smtp_password_configured = serializers.SerializerMethodField()

    class Meta:
        model = WorkshopProfile
        fields = (
            "id",
            "name",
            "address",
            "phone",
            "whatsapp",
            "email",
            "logo",
            "logo_url",
            "order_header_title",
            "estimate_header_title",
            "invoice_header_title",
            "document_footer",
            "email_service_enabled",
            "email_from_name",
            "email_from_address",
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "clear_smtp_password",
            "smtp_password_configured",
            "smtp_use_tls",
            "smtp_use_ssl",
            "password_reset_enabled",
            "password_reset_token_minutes",
            "password_reset_frontend_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "logo_url", "smtp_password_configured", "created_at", "updated_at")

    def get_logo_url(self, obj):
        if not obj.logo:
            return ""
        request = self.context.get("request")
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url

    def get_smtp_password_configured(self, obj):
        return bool(obj.smtp_password)

    def validate(self, attrs):
        use_tls = attrs.get("smtp_use_tls", getattr(self.instance, "smtp_use_tls", False))
        use_ssl = attrs.get("smtp_use_ssl", getattr(self.instance, "smtp_use_ssl", False))
        if use_tls and use_ssl:
            raise serializers.ValidationError({"smtp_use_ssl": "TLS y SSL no pueden estar activos al mismo tiempo."})
        token_minutes = attrs.get("password_reset_token_minutes", getattr(self.instance, "password_reset_token_minutes", 60))
        if token_minutes < 5:
            raise serializers.ValidationError({"password_reset_token_minutes": "El vencimiento minimo es de 5 minutos."})
        return attrs

    def update(self, instance, validated_data):
        smtp_password = validated_data.pop("smtp_password", "")
        clear_smtp_password = validated_data.pop("clear_smtp_password", False)
        instance = super().update(instance, validated_data)
        if clear_smtp_password:
            instance.smtp_password = ""
            instance.save(update_fields=["smtp_password", "updated_at"])
        elif smtp_password:
            instance.smtp_password = smtp_password
            instance.save(update_fields=["smtp_password", "updated_at"])
        return instance


class EmailTestSerializer(serializers.Serializer):
    recipient = serializers.EmailField()
