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
  Typography,
} from "@mui/material";

import LogoMark from "../components/LogoMark.jsx";
import { navigation } from "./navigation.js";

export default function Sidebar({ drawerWidth, mobileOpen, onClose }) {
  const content = (
    <Box height="100%" display="flex" flexDirection="column">
      <Toolbar sx={{ px: 3 }}>
        <LogoMark />
      </Toolbar>
      <Divider sx={{ borderColor: "customColors.navBorder" }} />
      <List sx={{ px: 2, py: 2 }}>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={onClose}
              sx={{
                my: 0.4,
                borderRadius: 2,
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
              <ListItemIcon sx={{ minWidth: 40, color: "customColors.navTextMuted" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ variant: "button", fontWeight: 700 }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box mt="auto" px={3} py={2}>
        <Typography variant="caption" color="customColors.navTextMuted">
          AutoFlow v0.1.0
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
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            borderRight: 0,
            bgcolor: "customColors.navBg",
            color: "customColors.navText",
            boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.1)",
          },
        }}
        open
      >
        {content}
      </Drawer>
    </>
  );
}
