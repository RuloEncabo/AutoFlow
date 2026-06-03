import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute.jsx";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import AuditPage from "../pages/audit/AuditPage.jsx";
import AppointmentsPage from "../pages/appointments/AppointmentsPage.jsx";
import BillingPage from "../pages/billing/BillingPage.jsx";
import ClientsPage from "../pages/clients/ClientsPage.jsx";
import LoginPage from "../pages/login/LoginPage.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import InventoryPage from "../pages/inventory/InventoryPage.jsx";
import OperatorsPage from "../pages/operators/OperatorsPage.jsx";
import SettingsPage from "../pages/settings/SettingsPage.jsx";
import TasksPage from "../pages/tasks/TasksPage.jsx";
import TvDashboardPage from "../pages/tvDashboard/TvDashboardPage.jsx";
import UsersPage from "../pages/users/UsersPage.jsx";
import VehiclesPage from "../pages/vehicles/VehiclesPage.jsx";
import WorkOrdersPage from "../pages/workOrders/WorkOrdersPage.jsx";
import { ROLES } from "../auth/roles.js";

function withRoles(element, roles) {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: withRoles(<DashboardPage />, [ROLES.ADMIN, ROLES.OPERATIVE, ROLES.ADMINISTRATION]) },
      { path: "appointments", element: withRoles(<AppointmentsPage />, [ROLES.ADMIN]) },
      { path: "clients", element: withRoles(<ClientsPage />, [ROLES.ADMIN, ROLES.OPERATIVE]) },
      { path: "vehicles", element: withRoles(<VehiclesPage />, [ROLES.ADMIN, ROLES.OPERATIVE]) },
      { path: "operators", element: withRoles(<OperatorsPage />, [ROLES.ADMIN]) },
      { path: "tasks", element: withRoles(<TasksPage />, [ROLES.ADMIN, ROLES.OPERATIVE]) },
      { path: "work-orders", element: withRoles(<WorkOrdersPage />, [ROLES.ADMIN, ROLES.OPERATIVE]) },
      { path: "inventory", element: withRoles(<InventoryPage />, [ROLES.ADMIN]) },
      { path: "billing", element: withRoles(<BillingPage />, [ROLES.ADMIN, ROLES.ADMINISTRATION]) },
      { path: "tv-dashboard", element: withRoles(<TvDashboardPage />, [ROLES.ADMIN, ROLES.OPERATIVE]) },
      { path: "audit", element: withRoles(<AuditPage />, [ROLES.ADMIN]) },
      { path: "users", element: withRoles(<UsersPage />, [ROLES.ADMIN]) },
      { path: "settings", element: withRoles(<SettingsPage />, [ROLES.ADMIN]) },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
