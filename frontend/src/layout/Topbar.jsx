import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logout } from "../auth/authSlice.js";

export default function Topbar({ drawerWidth, onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login", { replace: true });
  };

  const initials = user?.first_name?.[0] || user?.email?.[0] || "A";

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
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { lg: "none" } }}
          aria-label="Abrir navegacion"
        >
          <MenuIcon />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h6" color="text.primary">
            Gestion integral
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Taller automotor, turnos y ordenes
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1}>
          <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
            {initials.toUpperCase()}
          </Avatar>
          <Box display={{ xs: "none", sm: "block" }}>
            <Typography variant="button" color="text.primary">
              {user?.full_name || user?.email || "Usuario"}
            </Typography>
            <Typography display="block" variant="caption" color="text.secondary">
              {user?.role === "admin" ? "Administrador" : "Usuario App"}
            </Typography>
          </Box>
          <Tooltip title="Cerrar sesion">
            <IconButton onClick={handleLogout} aria-label="Cerrar sesion">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
