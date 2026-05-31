import { createTheme } from "@mui/material/styles";

const fontFamily = [
  '"Public Sans"',
  "sans-serif",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  '"Helvetica Neue"',
  "Arial",
  "sans-serif",
].join(",");

const mainTextRgb = "15, 20, 20";
const divider = `rgba(${mainTextRgb}, 0.12)`;

export const theme = createTheme({
  palette: {
    customColors: {
      main: "#0F1414",
      mainRgb: mainTextRgb,
      bodyBg: "#F8F7FA",
      tableHeaderBg: "#F6F6F7",
      navBg: "#001B28",
      navPaper: "#002537",
      navBorder: "#2E444F",
      navText: "#FFFFFF",
      navTextMuted: "#DBD8D6",
      navHover: "rgba(255, 255, 255, 0.08)",
      navActiveBg: "rgba(0, 124, 183, 0.18)",
    },
    background: {
      default: "#F8F7FA",
      paper: "#ffffff",
    },
    text: {
      primary: `rgba(${mainTextRgb}, 0.87)`,
      secondary: `rgba(${mainTextRgb}, 0.68)`,
      disabled: `rgba(${mainTextRgb}, 0.42)`,
    },
    primary: {
      light: "#3D9DD9",
      main: "#007CB7",
      dark: "#00618F",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#8A9696",
      main: "#707C7C",
      dark: "#5A6464",
      contrastText: "#ffffff",
    },
    success: {
      light: "#5BC87A",
      main: "#2FB456",
      dark: "#258C43",
      contrastText: "#ffffff",
    },
    warning: {
      light: "#FFAB5A",
      main: "#FF9F43",
      dark: "#E08C3B",
      contrastText: "#ffffff",
    },
    error: {
      light: "#ED6F70",
      main: "#EA5455",
      dark: "#CE4A4B",
      contrastText: "#ffffff",
    },
    info: {
      light: "#3D9DD9",
      main: "#007CB7",
      dark: "#00618F",
      contrastText: "#ffffff",
    },
    divider,
    action: {
      active: `rgba(${mainTextRgb}, 0.54)`,
      hover: `rgba(${mainTextRgb}, 0.04)`,
      selected: `rgba(${mainTextRgb}, 0.08)`,
      selectedOpacity: 0.08,
      disabled: `rgba(${mainTextRgb}, 0.26)`,
      disabledBackground: `rgba(${mainTextRgb}, 0.12)`,
      focus: `rgba(${mainTextRgb}, 0.12)`,
    },
  },
  typography: {
    fontFamily,
    fontSize: 13.125,
    h1: { fontWeight: 500, fontSize: "2.375rem", lineHeight: 1.368421, letterSpacing: 0 },
    h2: { fontWeight: 500, fontSize: "2rem", lineHeight: 1.375, letterSpacing: 0 },
    h3: { fontWeight: 500, fontSize: "1.625rem", lineHeight: 1.38462, letterSpacing: 0 },
    h4: { fontWeight: 500, fontSize: "1.375rem", lineHeight: 1.364, letterSpacing: 0 },
    h5: { fontWeight: 500, fontSize: "1.125rem", lineHeight: 1.3334, letterSpacing: 0 },
    h6: { fontWeight: 500, fontSize: "0.9375rem", lineHeight: 1.4, letterSpacing: 0 },
    subtitle1: { fontSize: "1rem", letterSpacing: 0 },
    subtitle2: { fontSize: "0.875rem", lineHeight: 1.32, letterSpacing: 0 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.467, letterSpacing: 0 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.53846154, letterSpacing: 0 },
    caption: { fontSize: "0.6875rem", lineHeight: 1.273, letterSpacing: 0 },
    button: {
      textTransform: "none",
      fontWeight: 500,
      lineHeight: 1.2,
      fontSize: "0.9375rem",
      letterSpacing: "0.43px",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: 50,
          textTransform: "none",
          transition: "background-color 150ms, box-shadow 150ms, border-color 150ms, color 150ms, transform 150ms",
          "&:not(.Mui-disabled):active": {
            transform: "scale(0.98)",
          },
        },
        contained: {
          padding: "10px 20px",
          boxShadow: "0px 2px 6px 0px rgba(47, 43, 61, 0.14)",
          "&:hover": {
            boxShadow: "0px 2px 6px 0px rgba(47, 43, 61, 0.14)",
          },
        },
        outlined: {
          padding: "9px 19px",
        },
        sizeSmall: {
          borderRadius: 4,
          fontSize: "0.8125rem",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 7,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0px 4px 18px 0px rgba(47, 43, 61, 0.1)",
          "& .MuiTableContainer-root": {
            borderRadius: 0,
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          "&:last-of-type": {
            paddingBottom: 24,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: "0.8125rem",
          "&.MuiChip-sizeSmall": {
            height: 24,
          },
        },
        labelSmall: {
          paddingLeft: 10,
          paddingRight: 10,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderTop: `1px solid ${divider}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          textTransform: "uppercase",
          backgroundColor: "#F6F6F7",
          "& .MuiTableCell-head": {
            fontWeight: 500,
            letterSpacing: "1px",
            fontSize: "0.8125rem",
            color: `rgba(${mainTextRgb}, 0.68)`,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-body": {
            letterSpacing: "0.25px",
            color: `rgba(${mainTextRgb}, 0.68)`,
            paddingTop: 14,
            paddingBottom: 14,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${divider}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head:not(.MuiTableCell-paddingCheckbox):first-of-type, & .MuiTableCell-root:not(.MuiTableCell-paddingCheckbox):first-of-type": {
            paddingLeft: 24,
          },
          "& .MuiTableCell-head:last-of-type, & .MuiTableCell-root:last-of-type": {
            paddingRight: 24,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderBottom: `1px solid ${divider}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          textTransform: "none",
          padding: "7px 20px",
          fontSize: "0.9375rem",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: `rgba(${mainTextRgb}, 0.2)`,
          },
          "&:hover:not(.Mui-focused):not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
            borderColor: `rgba(${mainTextRgb}, 0.28)`,
          },
          "&.Mui-focused": {
            boxShadow: "0px 2px 6px 0px rgba(47, 43, 61, 0.14)",
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          letterSpacing: "0.15px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
  },
});
