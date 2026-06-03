from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenVerifyView

from .views import LoginView, LogoutView, MeView, RefreshView, UserViewSet

app_name = "accounts"

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("verify/", TokenVerifyView.as_view(), name="verify"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
] + router.urls
