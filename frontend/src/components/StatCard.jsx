import { Card, CardContent, Divider, Stack, Typography, Box } from "@mui/material";

export default function StatCard({ title, value, helper, icon, color = "primary" }) {
  return (
    <Card>
      <CardContent sx={{ pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box
            width={56}
            height={56}
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius={2}
            color="white"
            sx={(theme) => ({
              bgcolor: theme.palette[color].main,
              boxShadow: "none",
            })}
          >
            {icon}
          </Box>
          <Box textAlign="right" minWidth={0}>
            <Typography variant="button" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" color="text.primary">
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
      <Divider />
      <Box px={2} py={1.5}>
        <Typography variant="body2" color="text.secondary">
          {helper}
        </Typography>
      </Box>
    </Card>
  );
}
