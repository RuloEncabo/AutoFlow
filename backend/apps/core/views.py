from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminOrReadOnly
from .serializers import HealthSerializer, WorkshopProfileSerializer
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
