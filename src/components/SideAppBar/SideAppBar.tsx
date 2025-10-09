import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import "./../../index.css";
import { Drawer } from "@mui/material";

interface SideAppBarProps {
  open: boolean; // controla se a barra está aberta ou retraída
}

export default function SideAppBar({ open }: SideAppBarProps) {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 220,
        "& .MuiDrawer-paper": {
          transition: "left 0.3s ease",
          width: 220,
          top: 80,
          left: open ? 0 : -220,
          backgroundColor: "var(--background-color-bar)",
          color: "white",
          boxSizing: "border-box",
          borderRadius: "0px 10px 0 ",
        },
      }}
    >
      <Box sx={{ alignItems: "center", p: 2 }}>
        <Typography variant="h6" sx={{ ml: 1, textAlign: "center" }}>
          Conversas
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", p: 2, gap: 1 }}>
        <Button
          sx={{
            backgroundColor: "var(--background-color)",
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
          }}
          color="inherit"
        >
          9999
        </Button>
        <Button color="inherit">9998</Button>
        <Button color="inherit">9997</Button>
      </Box>
    </Drawer>
  );
}
