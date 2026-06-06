import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsIcon from "@mui/icons-material/Groups";
import HistoryIcon from "@mui/icons-material/History";
import InventoryIcon from "@mui/icons-material/Inventory";
import MonitorIcon from "@mui/icons-material/Monitor";
import EngineeringIcon from "@mui/icons-material/Engineering";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

import { ROLES } from "../auth/roles.js";

export const navigation = [
  { label: "Dashboard operativo", path: "/dashboard-operativo", icon: DashboardIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Dashboard financiero", path: "/dashboard-financiero", icon: PaidIcon, roles: [ROLES.ADMIN, ROLES.ADMINISTRATION] },
  { label: "Clientes", path: "/clients", icon: GroupsIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Vehiculos", path: "/vehicles", icon: CarRepairIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Operarios", path: "/operators", icon: EngineeringIcon, roles: [ROLES.ADMIN] },
  { label: "Tareas", path: "/tasks", icon: TaskAltIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Turnos", path: "/appointments", icon: CalendarMonthIcon, roles: [ROLES.ADMIN] },
  { label: "Recepcion", path: "/reception", icon: FactCheckOutlinedIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Ordenes", path: "/work-orders", icon: FactCheckIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Insumos y Repuestos", path: "/inventory", icon: InventoryIcon, roles: [ROLES.ADMIN] },
  { label: "Facturacion", path: "/billing", icon: ReceiptLongIcon, roles: [ROLES.ADMIN, ROLES.ADMINISTRATION] },
  { label: "TV taller", path: "/tv-dashboard", icon: MonitorIcon, roles: [ROLES.ADMIN, ROLES.OPERATIVE] },
  { label: "Auditoria", path: "/audit", icon: HistoryIcon, roles: [ROLES.ADMIN] },
  { label: "Usuarios", path: "/users", icon: ManageAccountsIcon, roles: [ROLES.ADMIN] },
  { label: "Configuracion", path: "/settings", icon: SettingsIcon, roles: [ROLES.ADMIN] },
];
