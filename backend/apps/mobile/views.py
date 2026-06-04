from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log
from apps.core.services import get_workshop_profile
from apps.reception.serializers import ReceptionDamageSerializer, VehicleReceptionSerializer

from .serializers import MobileConfigSerializer, PlateRecognitionResultSerializer, PlateRecognitionSerializer, extract_plate


class PlateRecognitionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        serializer = PlateRecognitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data.get("provider") or "manual"
        raw_text = serializer.validated_data.get("raw_text") or ""
        plate, confidence = extract_plate(raw_text)
        has_image = bool(serializer.validated_data.get("image"))

        if has_image and not raw_text:
            message = "Imagen recibida. OCR preparado para conectar Google ML Kit, OpenCV o proveedor externo."
            confidence = 0.0
        elif plate and confidence >= 0.75:
            message = "Patente detectada con confianza suficiente."
        elif plate:
            message = "Patente probable detectada. Requiere confirmacion manual."
        else:
            message = "No se detecto patente. Ingrese el dominio manualmente."

        payload = {
            "plate": plate,
            "plate_normalized": plate,
            "confidence": confidence,
            "provider": provider,
            "requires_manual_review": confidence < 0.75,
            "message": message,
        }

        create_audit_log(
            request=request,
            module="mobile",
            action=AuditAction.CREATE,
            object_type="PlateRecognition",
            new_data={
                "provider": provider,
                "plate": plate,
                "confidence": confidence,
                "has_image": has_image,
                "requires_manual_review": payload["requires_manual_review"],
            },
        )
        return Response(PlateRecognitionResultSerializer(payload).data)


class MobileConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_workshop_profile()
        payload = {
            "mobile_api_enabled": profile.mobile_api_enabled,
            "mobile_default_api_url": profile.mobile_default_api_url,
            "mobile_photo_upload_enabled": profile.mobile_photo_upload_enabled,
            "mobile_require_damage_photo": profile.mobile_require_damage_photo,
            "mobile_max_photo_mb": profile.mobile_max_photo_mb,
            "mobile_offline_sync_enabled": profile.mobile_offline_sync_enabled,
            "workshop_name": profile.name,
            "workshop_phone": profile.phone,
            "workshop_whatsapp": profile.whatsapp,
        }
        return Response(MobileConfigSerializer(payload).data)


class MobileReceptionView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        profile = get_workshop_profile()
        if not profile.mobile_api_enabled:
            raise ValidationError({"mobile": "La API movil no esta habilitada."})
        payload = request.data.copy()
        payload["source"] = "apk"
        serializer = VehicleReceptionSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        reception = serializer.save(created_by=request.user, updated_by=request.user)
        create_audit_log(
            request=request,
            module="mobile_reception",
            action=AuditAction.CREATE,
            object_type="VehicleReception",
            object_id=reception.pk,
            new_data={"reception_number": reception.reception_number, "source": "apk"},
        )
        return Response(VehicleReceptionSerializer(reception, context={"request": request}).data)


class MobileReceptionDamageView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        profile = get_workshop_profile()
        if not profile.mobile_api_enabled:
            raise ValidationError({"mobile": "La API movil no esta habilitada."})
        if not profile.mobile_photo_upload_enabled and request.FILES.get("photo"):
            raise ValidationError({"photo": "La carga de fotos desde APK no esta habilitada."})
        if profile.mobile_require_damage_photo and not request.FILES.get("photo"):
            raise ValidationError({"photo": "La foto del dano es obligatoria."})
        photo = request.FILES.get("photo")
        if photo and photo.size > profile.mobile_max_photo_mb * 1024 * 1024:
            raise ValidationError({"photo": f"La foto supera el maximo de {profile.mobile_max_photo_mb} MB."})
        payload = request.data.copy()
        payload["source"] = "apk"
        serializer = ReceptionDamageSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        damage = serializer.save(created_by=request.user)
        create_audit_log(
            request=request,
            module="mobile_reception_damage",
            action=AuditAction.CREATE,
            object_type="ReceptionDamage",
            object_id=damage.pk,
            new_data={"reception": str(damage.reception_id), "source": "apk", "has_photo": bool(damage.photo)},
        )
        return Response(ReceptionDamageSerializer(damage, context={"request": request}).data)
