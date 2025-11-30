import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type React from "react";

// Tipagem das props
interface InviteDialogGroupProps {
  invite: {
    from: string;
    requestId: string;
    groupName: string;
    timestamp: string;
  } | null;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export const AcceptDialogGroup: React.FC<InviteDialogGroupProps> = ({
  invite,
  onAccept,
  onReject,
  onClose,
}) => {
  return (
    <Dialog
      open={invite?.from !== ""}
      onClose={() => {
        onReject();
        onClose?.();
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, textAlign: "center" }}>
        📩 Novo pedido
      </DialogTitle>

      <DialogContent sx={{ textAlign: "center" }}>
        {invite ? (
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>{invite.from}</strong> te enviou um pedido para entrar no
            Grupo: {invite?.groupName}.
            <br />
            Deseja aceitar?
          </Typography>
        ) : (
          <Typography variant="body2">Carregando pedido...</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          onClick={() => {
            onReject();
            onClose();
          }}
          color="error"
          variant="outlined"
          sx={{ px: 3 }}
        >
          Recusar
        </Button>
        <Button
          onClick={() => {
            onAccept();
            onClose();
          }}
          color="primary"
          variant="contained"
          sx={{ px: 3 }}
        >
          Aceitar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
