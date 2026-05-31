from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import create_audit_log

from .serializers import PlateRecognitionResultSerializer, PlateRecognitionSerializer, extract_plate


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
