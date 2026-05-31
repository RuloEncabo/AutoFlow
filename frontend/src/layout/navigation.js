import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupsIcon from "@mui/icons-material/Groups";
import HistoryIcon from "@mui/icons-material/History";
import InventoryIcon from "@mui/icons-material/Inventory";
import MonitorIcon from "@mui/icons-material/Monitor";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

export const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
  { label: "Clientes", path: "/clients", icon: GroupsIcon },
  { label: "Vehiculos", path: "/vehicles", icon: CarRepairIcon },
  { label: "Operarios", path: "/operators", icon: EngineeringIcon },
  { label: "Tareas", path: "/tasks", icon: TaskAltIcon },
  { label: "Turnos", path: "/appointments", icon: CalendarMonthIcon },
  { label: "Ordenes", path: "/work-orders", icon: FactCheckIcon },
  { label: "Inventario", path: "/inventory", icon: InventoryIcon },
  { label: "Facturacion", path: "/billing", icon: ReceiptLongIcon },
  { label: "TV taller", path: "/tv-dashboard", icon: MonitorIcon },
  { label: "Auditoria", path: "/audit", icon: HistoryIcon },
  { label: "Configuracion", path: "/settings", icon: SettingsIcon },
];
