import { NavLink } from "react-router-dom";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";

import LogoMark from "../components/LogoMark.jsx";
import { navigation } from "./navigation.js";
import { hasAllowedRole } from "../auth/roles.js";

export default function Sidebar({ drawerWidth, collapsedWidth, collapsed = false, mobileOpen, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const visibleNavigation = navigation.filter((item) => hasAllowedRole(user, item.roles));
  const desktopWidth = collapsed ? collapsedWidth : drawerWidth;

  const content = (isCollapsed = false) => (
    <Box height="100%" display="flex" flexDirection="column">
      <Toolbar sx={{ px: isCollapsed ? 2 : 3, justifyContent: isCollapsed ? "center" : "flex-start" }}>
        <LogoMark compact={isCollapsed} />
      </Toolbar>
      <Divider sx={{ borderColor: "customColors.navBorder" }} />
      <List sx={{ px: isCollapsed ? 1 : 2, py: 2 }}>
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const button = (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={onClose}
              sx={{
                my: 0.4,
                borderRadius: 2,
                minHeight: 44,
                justifyContent: isCollapsed ? "center" : "flex-start",
                color: "customColors.navTextMuted",
                "&:hover": {
                  color: "customColors.navText",
                  bgcolor: "customColors.navHover",
                  "& .MuiListItemIcon-root": { color: "customColors.navText" },
                },
                "&.active": {
                  color: "customColors.navText",
                  backgroundColor: "customColors.navActiveBg",
                  boxShadow: "none",
                  "& .MuiListItemIcon-root": { color: "customColors.navText" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40, color: "customColors.navTextMuted", justifyContent: "center" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ variant: "button", fontWeight: 700 }}
                />
              )}
            </ListItemButton>
          );
          return isCollapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : button;
        })}
      </List>
      <Box mt="auto" px={isCollapsed ? 1 : 3} py={2} textAlign={isCollapsed ? "center" : "left"}>
        <Typography variant="caption" color="customColors.navTextMuted">
          {isCollapsed ? "AutoFlow" : "AutoFlow v0.1.0"}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            bgcolor: "customColors.navBg",
            color: "customColors.navText",
          },
        }}
      >
        {content(false)}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: desktopWidth,
            borderRight: 0,
            bgcolor: "customColors.navBg",
            color: "customColors.navText",
            boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.1)",
            overflowX: "hidden",
            transition: "width 180ms ease",
          },
        }}
        open
      >
        {content(collapsed)}
      </Drawer>
    </>
  );
}
