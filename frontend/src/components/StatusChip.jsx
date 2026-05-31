import { Chip } from "@mui/material";

export default function StatusChip({ label, color = "default" }) {
  return <Chip label={label} color={color} size="small" />;
}
