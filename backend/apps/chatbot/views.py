from __future__ import annotations

from django.conf import settings
from django.core.cache import cache
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import ADMIN_ROLE

from .models import ChatbotInteraction, ChatbotRole
from .serializers import ChatbotMessageResponseSerializer, ChatbotMessageSerializer
from .services import ChatbotOrchestrator, ChatbotServiceError, new_session_id


def _rate_limit_for_user(user) -> tuple[int, int]:
    window = int(getattr(settings, "CHATBOT_RATE_LIMIT_WINDOW_SECONDS", 600))
    if getattr(user, "role", "") == ADMIN_ROLE:
        return int(getattr(settings, "CHATBOT_RATE_LIMIT_ADMIN", 60)), window
    return int(getattr(settings, "CHATBOT_RATE_LIMIT_USER", 30)), window


def _check_rate_limit(user) -> tuple[bool, int, int]:
    limit, window = _rate_limit_for_user(user)
    key = f"chatbot:rate:{user.pk}"
    current = cache.get(key)
    if current is None:
        cache.set(key, 1, timeout=window)
        return True, limit - 1, window
    if int(current) >= limit:
        return False, 0, window
    try:
        current = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window)
        current = 1
    return True, max(limit - int(current), 0), window


class ChatbotMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChatbotMessageSerializer,
        responses={200: ChatbotMessageResponseSerializer},
    )
    def post(self, request):
        allowed, remaining, window = _check_rate_limit(request.user)
        if not allowed:
            return Response(
                {
                    "detail": "Limite de mensajes del chatbot alcanzado. Intenta nuevamente en unos minutos.",
                    "retry_after_seconds": window,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = ChatbotMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session_id = data.get("session_id") or new_session_id()

        try:
            response = ChatbotOrchestrator(request.user).run(
                session_id=session_id,
                message=data["message"],
                history=data.get("history") or [],
                pending_action=data.get("pending_action"),
                confirmed=data.get("confirmed", False),
            )
        except ChatbotServiceError as exc:
            content = "Hubo un error al obtener la respuesta. Intent\u00e1 de nuevo."
            ChatbotInteraction.objects.create(
                user=request.user,
                session_id=session_id,
                role=ChatbotRole.ASSISTANT,
                content=content,
                metadata={"error": str(exc)},
            )
            return Response(
                {
                    "session_id": session_id,
                    "message": {"role": "assistant", "content": content},
                    "rich_content": [
                        {
                            "type": "error",
                            "title": "Error del chatbot",
                            "message": content,
                        }
                    ],
                    "tools_used": [],
                    "requires_confirmation": False,
                    "pending_action": None,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        response["rate_limit"] = {"remaining": remaining, "window_seconds": window}
        return Response(response)
