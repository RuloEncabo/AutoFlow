import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery } from "@mui/material";

import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const drawerWidth = 280;
const collapsedDrawerWidth = 84;

export default function DashboardLayout() {
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const activeDrawerWidth = isDesktop && desktopCollapsed ? collapsedDrawerWidth : drawerWidth;

  const handleMenuClick = () => {
    if (isDesktop) {
      setDesktopCollapsed((current) => !current);
      return;
    }
    setMobileOpen(true);
  };

  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Topbar drawerWidth={activeDrawerWidth} onMenuClick={handleMenuClick} sidebarCollapsed={desktopCollapsed} />
      <Sidebar
        drawerWidth={drawerWidth}
        collapsedWidth={collapsedDrawerWidth}
        collapsed={isDesktop && desktopCollapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        flexGrow={1}
        width={{ xs: "100%", lg: `calc(100% - ${activeDrawerWidth}px)` }}
        ml={{ lg: `${activeDrawerWidth}px` }}
        px={{ xs: 1.5, sm: 2, md: 3 }}
        pb={4}
        sx={{ transition: "margin-left 180ms ease, width 180ms ease", minWidth: 0 }}
      >
        <Box sx={{ height: { xs: 92, md: 104 } }} />
        <Box maxWidth={1600} mx="auto" pt={{ xs: 2, md: 3 }} minWidth={0}>
          <Outlet />
        </Box>
      </Box>
      {!isDesktop && null}
    </Box>
  );
}
