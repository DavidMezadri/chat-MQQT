import {
  Box,
  Button,
  Typography,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import type {
  GroupDiscoveredEvent,
  GroupJoinRequestEvent,
} from "../../service/NewChatService";

interface GroupsListModalProps {
  open: boolean;
  onClose: () => void;
  groups: GroupDiscoveredEvent[];
  onEnter: (group: GroupJoinRequestEvent) => void;
  onInfo: (group: GroupDiscoveredEvent) => void;
  onList: () => void;
  hoiam: string;
}

export default function GroupsListModal({
  open,
  onClose,
  groups,
  onEnter,
  onInfo,
  onList,
  hoiam,
}: GroupsListModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      closeAfterTransition
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: 800,
          maxHeight: "80vh",
          overflowY: "auto",
          bgcolor: "var(--background-accent)",
          borderRadius: 2,
          p: 4,
          boxShadow: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography
          id="modal-title"
          variant="h6"
          component="h2"
          textAlign="center"
          color="var(--color-text-primary)"
          sx={{ mb: 1 }}
        >
          Lista de Grupos
        </Typography>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Nome do Grupo</strong>
                </TableCell>
                <TableCell>
                  <strong>Tópico Admin</strong>
                </TableCell>
                <TableCell>
                  <strong>Admin</strong>
                </TableCell>
                <TableCell>
                  <strong>Qtd. Usuários</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Ações</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {groups.map((group, index) => (
                <TableRow key={index} hover>
                  <TableCell>{group.groupName}</TableCell>
                  <TableCell>{group.controlAdminTopic}</TableCell>
                  <TableCell>{group.adminId}</TableCell>
                  <TableCell>{group.memberCount}</TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{ display: "flex", gap: 1, justifyContent: "center" }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          console.log("requestJoinGroup event:", group);
                          console.log(
                            "TOPIC QUE VAI SER USADO:",
                            group.controlAdminTopic
                          );
                          onEnter({
                            type: "group_join_request",
                            adminId: group.adminId,
                            controlAdminTopic: group.controlAdminTopic,
                            createdAt: group.createdAt,
                            groupId: group.groupId,
                            groupName: group.groupName,
                            memberCount: 0,
                            members: [],
                            userRequestId: hoiam,
                          });
                        }}
                        disabled={group.adminId === hoiam}
                      >
                        Entrar
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => onInfo(group)}
                      >
                        Informações
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ alignSelf: "center", mt: 2 }}
        >
          Fechar
        </Button>
        <Button
          variant="outlined"
          onClick={onList}
          sx={{ alignSelf: "center", mt: 2 }}
        >
          Listar
        </Button>
      </Box>
    </Modal>
  );
}
