import re

from rest_framework import serializers

from apps.core.utils import normalize_plate


PLATE_PATTERNS = (
    re.compile(r"[A-Z]{2}\d{3}[A-Z]{2}"),
    re.compile(r"[A-Z]{3}\d{3}"),
)


class PlateRecognitionSerializer(serializers.Serializer):
    image = serializers.ImageField(required=False)
    raw_text = serializers.CharField(required=False, allow_blank=True)
    provider = serializers.ChoiceField(
        choices=["manual", "mlkit", "opencv", "external"],
        default="manual",
        required=False,
    )

    def validate(self, attrs):
        if not attrs.get("image") and not attrs.get("raw_text"):
            raise serializers.ValidationError("Debe enviar una imagen o texto detectado para analizar.")
        return attrs


class PlateRecognitionResultSerializer(serializers.Serializer):
    plate = serializers.CharField(allow_blank=True)
    plate_normalized = serializers.CharField(allow_blank=True)
    confidence = serializers.FloatField()
    provider = serializers.CharField()
    requires_manual_review = serializers.BooleanField()
    message = serializers.CharField()


class MobileConfigSerializer(serializers.Serializer):
    mobile_api_enabled = serializers.BooleanField()
    mobile_default_api_url = serializers.URLField(allow_blank=True)
    mobile_photo_upload_enabled = serializers.BooleanField()
    mobile_require_damage_photo = serializers.BooleanField()
    mobile_max_photo_mb = serializers.IntegerField()
    mobile_offline_sync_enabled = serializers.BooleanField()
    workshop_name = serializers.CharField()
    workshop_phone = serializers.CharField(allow_blank=True)
    workshop_whatsapp = serializers.CharField(allow_blank=True)


def extract_plate(raw_text: str) -> tuple[str, float]:
    normalized = normalize_plate(raw_text or "")
    for pattern in PLATE_PATTERNS:
        match = pattern.search(normalized)
        if match:
            return match.group(0), 0.82
    return normalized[:10], 0.45 if normalized else 0.0
