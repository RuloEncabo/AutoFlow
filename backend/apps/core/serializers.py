from rest_framework import serializers

from .models import WorkshopProfile


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    app = serializers.CharField()
    version = serializers.CharField()


class WorkshopProfileSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "logo_url", "created_at", "updated_at")

    def get_logo_url(self, obj):
        if not obj.logo:
            return ""
        request = self.context.get("request")
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url
