from django.urls import path

from .views import PlateRecognitionView

app_name = "mobile"

urlpatterns = [
    path("plate-recognition/", PlateRecognitionView.as_view(), name="plate-recognition"),
]
