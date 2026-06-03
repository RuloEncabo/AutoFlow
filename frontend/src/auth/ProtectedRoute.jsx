import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { hasAllowedRole } from "./roles.js";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasAllowedRole(user, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
