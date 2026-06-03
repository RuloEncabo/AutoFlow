export const ROLES = {
  ADMIN: "admin",
  OPERATIVE: "operativo",
  ADMINISTRATION: "administracion",
  APP_USER: "app_user",
};

export const roleLabels = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.OPERATIVE]: "Operativo",
  [ROLES.ADMINISTRATION]: "Administracion",
  [ROLES.APP_USER]: "Usuario App",
};

export function hasAllowedRole(user, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const role = user?.role;
  if (!role) return false;
  if (role === ROLES.APP_USER && allowedRoles.includes(ROLES.OPERATIVE)) return true;
  return allowedRoles.includes(role);
}
