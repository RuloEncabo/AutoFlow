import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Toolbar, useMediaQuery } from "@mui/material";

import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const drawerWidth = 280;

export default function DashboardLayout() {
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Topbar drawerWidth={drawerWidth} onMenuClick={() => setMobileOpen(true)} />
      <Sidebar
        drawerWidth={drawerWidth}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        flexGrow={1}
        width={{ lg: `calc(100% - ${drawerWidth}px)` }}
        ml={{ lg: `${drawerWidth}px` }}
        px={{ xs: 2, md: 3 }}
        pb={4}
      >
        <Toolbar />
        <Box maxWidth={1600} mx="auto" pt={3}>
          <Outlet />
        </Box>
      </Box>
      {!isDesktop && null}
    </Box>
  );
}

