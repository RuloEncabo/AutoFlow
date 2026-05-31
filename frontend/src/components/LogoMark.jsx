import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import { Box, Typography } from "@mui/material";

export default function LogoMark({ compact = false }) {
  return (
    <Box display="flex" alignItems="center" gap={1.25}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        width={40}
        height={40}
        borderRadius={2}
        color="white"
        sx={{
          background: "linear-gradient(195deg, #3D9DD9, #007CB7)",
          boxShadow: "0px 2px 6px 0px rgba(47, 43, 61, 0.14)",
        }}
      >
        <BuildCircleIcon />
      </Box>
      {!compact && (
        <Box>
          <Typography variant="h6" lineHeight={1} color="inherit">
            AutoFlow
          </Typography>
          <Typography variant="caption" sx={{ color: "inherit", opacity: 0.68 }}>
            Taller enterprise
          </Typography>
        </Box>
      )}
    </Box>
  );
}
