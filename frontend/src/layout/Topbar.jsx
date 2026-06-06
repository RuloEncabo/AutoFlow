import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { getOperationalDashboard } from "../api/dashboardApi.js";
import { logout } from "../auth/authSlice.js";
import { roleLabels } from "../auth/roles.js";

export default function Topbar({ drawerWidth, onMenuClick, sidebarCollapsed }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const dashboardQuery = useQuery({
    queryKey: ["topbar-notifications"],
    queryFn: getOperationalDashboard,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login", { replace: true });
  };

  const initials = user?.first_name?.[0] || user?.email?.[0] || "A";
  const data = dashboardQuery.data;
  const notifications = [
    {
      label: "Ordenes retrasadas",
      value: data?.stats?.delayed_orders ?? 0,
      helper: "Revisar compromisos de entrega",
    },
    {
      label: "Insumos criticos",
      value: data?.stock?.critical_total ?? 0,
      helper: "Insumos y repuestos bajo minimo",
    },
    {
      label: "Facturas pendientes",
      value: data?.billing?.pending_count ?? 0,
      helper: "Controlar deuda de clientes",
    },
  ].filter((item) => Number(item.value) > 0);
  const notificationsCount = notifications.reduce((acc, item) => acc + Number(item.value || 0), 0);

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        width: { lg: `calc(100% - ${drawerWidth}px)` },
        ml: { lg: `${drawerWidth}px` },
        backdropFilter: "blur(12px)",
        backgroundColor: "rgba(248, 247, 250, 0.82)",
        transition: "margin-left 180ms ease, width 180ms ease",
      }}
    >
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, minHeight: { xs: 84, md: 96 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          aria-label={sidebarCollapsed ? "Mostrar menu lateral" : "Ocultar menu lateral"}
        >
          <MenuIcon />
        </IconButton>
        <Box
          flexGrow={1}
          minWidth={0}
          height={{ xs: 58, sm: 66, md: 72 }}
          borderRadius={2}
          border="1px solid"
          borderColor="divider"
          overflow="hidden"
          position="relative"
          bgcolor="background.paper"
          sx={{ boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.08)" }}
        >
          <Box
            position="absolute"
            inset={0}
            width={{ xs: "100%", sm: "76%", md: "68%" }}
            bgcolor="primary.main"
            sx={{
              clipPath: { xs: "none", sm: "polygon(0 0, 88% 0, 76% 100%, 0% 100%)" },
            }}
          />
          <Box position="relative" zIndex={1} height="100%" display="flex" flexDirection="column" justifyContent="center" px={{ xs: 2, md: 3 }} minWidth={0}>
            <Typography variant="h5" color="common.white" sx={{ fontSize: { xs: "1rem", sm: "1.125rem", md: "1.25rem" }, fontWeight: 700 }}>
              Gestion integral
            </Typography>
            <Typography color="common.white" sx={{ fontSize: { xs: "0.72rem", sm: "0.82rem", md: "0.9rem" }, opacity: 0.95 }}>
              Taller automotor, turnos y ordenes
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          <Tooltip title="Notificaciones">
            <IconButton
              onClick={(event) => setNotificationsAnchor(event.currentTarget)}
              aria-label="Abrir notificaciones"
            >
              <Badge badgeContent={notificationsCount} color="error" max={99}>
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
            {initials.toUpperCase()}
          </Avatar>
          <Box display={{ xs: "none", sm: "block" }}>
            <Typography variant="button" color="text.primary">
              {user?.full_name || user?.email || "Usuario"}
            </Typography>
            <Typography display="block" variant="caption" color="text.secondary">
              {roleLabels[user?.role] || "Usuario"}
            </Typography>
          </Box>
          <Tooltip title="Cerrar sesion">
            <IconButton onClick={handleLogout} aria-label="Cerrar sesion">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notificationsAnchor}
            open={Boolean(notificationsAnchor)}
            onClose={() => setNotificationsAnchor(null)}
            PaperProps={{ sx: { width: 320, maxWidth: "calc(100vw - 24px)" } }}
          >
            <Box px={2} py={1.5}>
              <Typography variant="subtitle2">Notificaciones</Typography>
              <Typography variant="caption" color="text.secondary">
                Alertas operativas y financieras
              </Typography>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">No hay alertas pendientes.</Typography>
              </MenuItem>
            ) : notifications.map((item) => (
              <MenuItem key={item.label} sx={{ alignItems: "flex-start", gap: 1.5, py: 1.25 }}>
                <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>{item.value}</Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.helper}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
