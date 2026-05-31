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
import VehiclesPage from "../pages/vehicles/VehiclesPage.jsx";
import WorkOrdersPage from "../pages/workOrders/WorkOrdersPage.jsx";

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
      { path: "dashboard", element: <DashboardPage /> },
      { path: "appointments", element: <AppointmentsPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "vehicles", element: <VehiclesPage /> },
      { path: "operators", element: <OperatorsPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "work-orders", element: <WorkOrdersPage /> },
      { path: "inventory", element: <InventoryPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "tv-dashboard", element: <TvDashboardPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
