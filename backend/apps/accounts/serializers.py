from rest_framework import serializers

from .models import User, UserRole


ROLE_LABELS = {
    UserRole.ADMIN: "Administrador",
    UserRole.OPERATIVE: "Operativo",
    UserRole.ADMINISTRATION: "Administracion",
    UserRole.APP_USER: "Usuario App",
}


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    role_label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "role_label",
            "phone",
            "is_active",
            "last_login",
        )
        read_only_fields = fields

    def get_role_label(self, obj):
        return ROLE_LABELS.get(obj.role, obj.get_role_display())


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    role_label = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "role_label",
            "phone",
            "is_active",
            "password",
            "last_login",
            "date_joined",
        )
        read_only_fields = ("id", "full_name", "role_label", "last_login", "date_joined")

    def get_role_label(self, obj):
        return ROLE_LABELS.get(obj.role, obj.get_role_display())

    def validate_email(self, value):
        value = User.objects.normalize_email(value).strip().lower()
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return value

    def validate_role(self, value):
        if value == UserRole.APP_USER:
            return UserRole.OPERATIVE
        return value

    def validate(self, attrs):
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "La contrasena es obligatoria para crear el usuario."})
        return attrs

    def _apply_staff_flags(self, instance):
        instance.is_staff = instance.role == UserRole.ADMIN
        if instance.role != UserRole.ADMIN:
            instance.is_superuser = False
        return instance

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        self._apply_staff_flags(user)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        self._apply_staff_flags(instance)
        instance.save()
        return instance

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
