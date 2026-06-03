from rest_framework.permissions import SAFE_METHODS, BasePermission


ADMIN_ROLE = "admin"
OPERATIVE_ROLES = {"operativo", "app_user"}
ADMINISTRATION_ROLE = "administracion"


def user_role(request):
    return getattr(getattr(request, "user", None), "role", "")


def is_authenticated(request):
    return bool(request.user and request.user.is_authenticated)


class IsAdminRole(BasePermission):
    message = "Se requiere rol administrador."

    def has_permission(self, request, view):
        return bool(is_authenticated(request) and user_role(request) == ADMIN_ROLE)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return is_authenticated(request)
        return bool(is_authenticated(request) and user_role(request) == ADMIN_ROLE)


class IsAdminOrAppUser(BasePermission):
    def has_permission(self, request, view):
        return bool(is_authenticated(request) and user_role(request) in {ADMIN_ROLE, *OPERATIVE_ROLES})


class IsAuthenticatedAndAdminForDelete(BasePermission):
    message = "Solo un administrador puede dar de baja este registro."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        if request.method == "DELETE":
            return user_role(request) == ADMIN_ROLE
        return user_role(request) in {ADMIN_ROLE, *OPERATIVE_ROLES}


class IsAdminOrOperativeForDelete(BasePermission):
    message = "No tiene permisos operativos para este modulo."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        if request.method == "DELETE":
            return user_role(request) == ADMIN_ROLE
        return user_role(request) in {ADMIN_ROLE, *OPERATIVE_ROLES}


class IsAdminOrAdministrationForDelete(BasePermission):
    message = "No tiene permisos administrativos para este modulo."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        if request.method == "DELETE":
            return user_role(request) == ADMIN_ROLE
        return user_role(request) in {ADMIN_ROLE, ADMINISTRATION_ROLE}


class IsWorkOrderRole(BasePermission):
    message = "No tiene permisos sobre ordenes de trabajo."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        role = user_role(request)
        if request.method == "DELETE":
            return role == ADMIN_ROLE
        if request.method in SAFE_METHODS:
            return role in {ADMIN_ROLE, ADMINISTRATION_ROLE, *OPERATIVE_ROLES}
        return role in {ADMIN_ROLE, *OPERATIVE_ROLES}


class IsInventoryRole(BasePermission):
    message = "No tiene permisos sobre inventario."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        role = user_role(request)
        if request.method == "DELETE":
            return role == ADMIN_ROLE
        if request.method in SAFE_METHODS:
            return role in {ADMIN_ROLE, ADMINISTRATION_ROLE, *OPERATIVE_ROLES}
        return role == ADMIN_ROLE


class IsWorkOrderInventoryUsageRole(BasePermission):
    message = "No tiene permisos para consumir inventario en ordenes."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        role = user_role(request)
        if request.method == "DELETE":
            return role == ADMIN_ROLE
        if request.method in SAFE_METHODS:
            return role in {ADMIN_ROLE, ADMINISTRATION_ROLE, *OPERATIVE_ROLES}
        return role in {ADMIN_ROLE, *OPERATIVE_ROLES}


class IsOperatorRole(BasePermission):
    message = "No tiene permisos sobre operarios."

    def has_permission(self, request, view):
        if not is_authenticated(request):
            return False
        role = user_role(request)
        if request.method == "DELETE":
            return role == ADMIN_ROLE
        if request.method in SAFE_METHODS:
            return role in {ADMIN_ROLE, *OPERATIVE_ROLES}
        return role == ADMIN_ROLE
