from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    code = getattr(exc, "default_code", "error")
    message = getattr(exc, "default_detail", "No se pudo procesar la solicitud.")

    if isinstance(response.data, dict):
        details = response.data
    else:
        details = {"detail": response.data}

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "not_authenticated"
        message = "Credenciales no provistas o token invalido."
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        code = "permission_denied"
        message = "No tenes permisos para realizar esta accion."
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        code = "not_found"
        message = "El recurso solicitado no existe."
    elif response.status_code == status.HTTP_400_BAD_REQUEST:
        code = "validation_error"
        message = "No se pudo validar la solicitud."

    response.data = {
        "error": {
            "code": str(code),
            "message": str(message),
            "details": details,
        }
    }
    return response

