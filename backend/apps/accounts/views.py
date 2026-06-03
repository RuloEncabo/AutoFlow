from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.audit.models import SessionEvent
from apps.audit.services import create_session_audit
from apps.core.permissions import IsAdminRole
from .serializers import LogoutSerializer, UserProfileSerializer, UserSerializer


User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            create_session_audit(
                request=request,
                event=SessionEvent.FAILED_LOGIN,
                metadata={"email": request.data.get("email", "")},
            )
            raise

        create_session_audit(
            request=request,
            user=serializer.user,
            event=SessionEvent.LOGIN,
            metadata={"email": serializer.user.email},
        )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        user = None
        try:
            token = RefreshToken(request.data.get("refresh", ""))
            user_id = token.payload.get("user_id")
            if user_id:
                user = get_user_model().objects.filter(id=user_id).first()
        except TokenError:
            user = None

        response = super().post(request, *args, **kwargs)
        create_session_audit(
            request=request,
            user=user,
            event=SessionEvent.REFRESH,
            metadata={"rotated": "refresh" in response.data},
        )
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserProfileSerializer)
    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={204: None})
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response(
                {"detail": "Refresh token invalido o ya revocado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        create_session_audit(
            request=request,
            user=request.user,
            event=SessionEvent.LOGOUT,
            metadata={"email": request.user.email},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering_fields = ("email", "first_name", "last_name", "role", "is_active", "date_joined")
    ordering = ("email",)

    def get_queryset(self):
        return User.objects.filter(deleted_at__isnull=True)

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError({"user": "No puede darse de baja el usuario autenticado."})
        instance.is_active = False
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_active", "deleted_at"])
