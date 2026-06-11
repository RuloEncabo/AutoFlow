import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .emailing import send_configured_email
from .permissions import IsAdminOrReadOnly
from .serializers import EmailTestSerializer, HealthSerializer, WorkshopProfileSerializer
from .services import get_workshop_profile


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses=HealthSerializer)
    def get(self, request):
        return Response(
            {
                "status": "ok",
                "app": "AutoFlow API",
                "version": settings.SPECTACULAR_SETTINGS["VERSION"],
            }
        )


class WorkshopProfileView(APIView):
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(responses=WorkshopProfileSerializer)
    def get(self, request):
        serializer = WorkshopProfileSerializer(get_workshop_profile(), context={"request": request})
        return Response(serializer.data)

    @extend_schema(request=WorkshopProfileSerializer, responses=WorkshopProfileSerializer)
    def patch(self, request):
        profile = get_workshop_profile()
        serializer = WorkshopProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WorkshopEmailTestView(APIView):
    permission_classes = [IsAdminOrReadOnly]

    @extend_schema(request=EmailTestSerializer, responses={200: dict})
    def post(self, request):
        serializer = EmailTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = get_workshop_profile()
        send_configured_email(
            subject="Prueba de correo AutoFlow",
            text_body=(
                f"Hola.\n\n"
                f"Este es un correo de prueba enviado desde {profile.name}.\n"
                "La configuracion SMTP esta operativa."
            ),
            recipients=[serializer.validated_data["recipient"]],
            profile=profile,
        )
        return Response({"detail": "Correo de prueba enviado correctamente."})


class AiChatView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=dict, responses={200: dict})
    def post(self, request):
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return Response(
                {"detail": "OPENAI_API_KEY no esta configurada en el entorno."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        context = str(request.data.get("context", "")).strip()
        messages = request.data.get("messages", [])
        if not isinstance(messages, list):
            return Response({"detail": "El historial de mensajes no es valido."}, status=status.HTTP_400_BAD_REQUEST)

        fixed_prompt = "Sos un asistente de atenci\u00f3n al cliente. Respond\u00e9 siempre de forma clara, amable y concisa."
        system_prompt = fixed_prompt if not context else f"{fixed_prompt}\n\nContexto propio del chatbot:\n{context}"
        payload_messages = [{"role": "system", "content": system_prompt}]

        for message in messages:
            if not isinstance(message, dict):
                continue
            role = message.get("role")
            content = str(message.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                payload_messages.append({"role": role, "content": content})

        if len(payload_messages) == 1:
            return Response({"detail": "Debe enviar al menos un mensaje."}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": payload_messages,
            "temperature": 0.4,
        }
        openai_request = Request(
            settings.OPENAI_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(openai_request, timeout=45) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return Response(
                {"detail": "Hubo un error al obtener la respuesta. Intent\u00e1 de nuevo."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not content:
            return Response(
                {"detail": "Hubo un error al obtener la respuesta. Intent\u00e1 de nuevo."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"message": {"role": "assistant", "content": content}})
