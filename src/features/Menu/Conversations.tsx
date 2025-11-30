import { useEffect, useState } from "react";
import { AcceptDialog } from "../../components/AcceptDialog/AcceptDialog";
import AppTopBar from "../../components/AppTopBar/AppTopBar";
import ModalPhoneDrawer from "../../components/ModalPhone/ModalPhone";
import SideAppBar from "../../components/SideAppBar/SideAppBar";
import { MqttService } from "../../service/MqttService";
import {
  NewChatService,
  type GroupDiscoveredEvent,
  type LoadConversations,
} from "../../service/NewChatService";
import { ChatInput } from "../chat/ChatInput/ChatInput";
import { ChatWindow } from "../chat/ChatWindown/ChatWindown";
import { AcceptDialogGroup } from "../../components/AcceptDialogGroup/AcceptDialogGroup";

export interface Message {
  TimeStamp: string;
  text: string;
  author: string;
}

export interface TypeConversation {
  id: string;
  topic: string;
  messages?: Message[];
}

export default function Conversation() {
  //Setando os serviços
  const [_mqttService, setMqttService] = useState<MqttService>();
  const [newChatService, setNewChatService] = useState<NewChatService>();

  const [positionMenu, setPositionMenu] = useState(false);
  const [visibleModalPhoneDrawer, setVisibleModalPhoneDrawer] = useState(false);
  const [infoAcceptDialog, setInfoAcceptDialog] = useState({
    from: "",
    requestId: "",
    timestamp: "",
    groupName: "",
  });

  // Lista de conversas
  const [conversation, setConversation] = useState<TypeConversation[]>([
    {
      id: "",
      topic: "",
      messages: [{ author: "", TimeStamp: new Date().toISOString(), text: "" }],
    },
  ]);

  // Conversa selecionada
  const [selectedConversation, setSelectedConversation] =
    useState<TypeConversation>({
      id: "0",
      topic: "",
      messages: [{ author: "", TimeStamp: new Date().toISOString(), text: "" }],
    });

  //Lista de Grupos
  const [listGroups, setListGroups] = useState<GroupDiscoveredEvent[]>([]);

  // IDs dos botões na SideAppBar
  const [buttons, setButtons] = useState<{ id: string; status: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const events = newChatService?.pollAllEvents();
      if (!events) return;

      for (const ev of events) {
        if (ev.type === "invite_received") {
          if (buttons.find((b) => b.id === ev.from)) {
            alert(`Convite enviado novamente pelo: ${ev.from}`);
            return;
          }
          setInfoAcceptDialog({
            from: ev.from,
            requestId: ev.requestId,
            timestamp: ev.timestamp,
            groupName: "",
          });
        } else if (ev.type === "invite_accepted") {
          const accepted = ev as any;

          const mappedStateConversations = conversation.map((c) => ({
            userId: c.id,
            topic: c.topic,
            chatIndividual: true, // ou false, depende da sua lógica
            timestamp: new Date().toISOString(),
          }));

          const newConversation = {
            userId: accepted.acceptedBy,
            topic: accepted.chatTopic,
            chatIndividual: true,
            timestamp: new Date().toISOString(),
          };

          const conversationsToSend = [
            ...mappedStateConversations,
            newConversation,
          ];

          const payload: LoadConversations = {
            type: "load_conversation",
            conversations: conversationsToSend,
          };

          newChatService?.setConversations(payload);

          console.log(
            `Aceito por: ${accepted.acceptedBy}, TÓPICO: ${accepted.chatTopic}`
          );
        } else if (ev.type === "message_received") {
          const existingConversation = conversation.find(
            (c) => c.id === ev.from
          );
          if (existingConversation) {
            const newMessage = {
              author: ev.from,
              TimeStamp: ev.timestamp,
              text: ev.content,
            };

            setConversation((prev) =>
              prev.map((c) =>
                c.id === ev.from
                  ? { ...c, messages: [...(c.messages ?? []), newMessage] }
                  : c
              )
            );

            // Atualiza a conversa atualmente aberta
            setSelectedConversation((prev) =>
              prev && prev.id === ev.from
                ? {
                    ...prev,
                    messages: [...(prev.messages ?? []), newMessage],
                  }
                : prev
            );
          } else {
            //Se chegar mensagem e nao existir, cria nova
            const newMessage = {
              author: ev.from,
              TimeStamp: ev.timestamp,
              text: ev.content,
            };

            const newConversation = {
              id: ev.from,
              topic: ev.chatTopic,
              messages: [newMessage],
            };

            // adiciona botão da conversa
            setButtons((prev) => [
              ...prev,
              {
                id: ev.from,
                status: "online",
              },
            ]);

            // adiciona conversa nova
            setConversation((prev) => [...prev, newConversation]);
          }
        } else if (ev.type === "presence_update") {
          const userId = ev.userId;
          const status = ev.status; // online / offline

          // Verifica se existe
          const exists = buttons.some((btn) => btn.id === userId);

          if (exists) {
            //console.log("👀 Atualizando presença do usuário:", userId);

            setButtons((prev) =>
              prev.map((btn) =>
                btn.id === userId
                  ? { ...btn, status } // ← atualiza só esse
                  : btn
              )
            );
          } else {
            //console.log("🔍 Presence de alguém que não tem conversa aberta:",userId);
          }
        } else if (ev.type === "load_conversation") {
          console.log("Entrou no load conversation para gerar conversas:", ev);
          setButtons(() =>
            ev.conversations.map((c: any) => ({
              id: c.userId,
              status: "offline",
            }))
          );
          setConversation((prev) => [
            ...prev,
            ...ev.conversations
              .filter((c: any) => !prev.some((p) => p.id === c.userId))
              .map((c: any) => ({
                id: c.userId,
                topic: c.topic,
                messages: [],
              })),
          ]);
        } else if (ev.type === "group_created") {
          if (buttons.find((b) => b.id === ev.groupName)) {
            alert(`Grupo já está criado:${ev.groupName} - ${ev.groupTopic}`);
            return;
          }
          setButtons((prev) => [
            ...prev,
            {
              id: ev.groupName,
              status: "grupo",
            },
          ]);

          setConversation((prev) => [
            ...prev,
            { id: ev.groupName, topic: ev.groupTopic, messages: [] },
          ]);
        } else if (ev.type === "group_discovered") {
          setListGroups((prev) => {
            // verifica se já existe grupo com o mesmo ID OU nome
            const exists = prev.some(
              (g) => g.groupId === ev.groupId || g.groupName === ev.groupName
            );

            if (exists) return prev; // não adiciona duplicado

            // adiciona novo grupo
            return [...prev, ev];
          });
        } else if (ev.type === "group_join_request") {
          if (
            listGroups.find(
              (b) =>
                b.groupName === ev.groupName &&
                b.members?.some((u) => u === ev.userRequestId)
            )
          ) {
            alert(
              `Convite enviado para entrar no grupo ${ev.groupName}, já enviado pelo: ${ev.userRequestId}`
            );
            return;
          }
          console.log("convite recebido", ev.userRequestId);
          setInfoAcceptDialog({
            from: ev.userRequestId,
            requestId: ev.userRequestId,
            timestamp: new Date().toISOString(),
            groupName: ev.groupName,
          });
        } else if (ev.type === "group_join_approved") {
          if (buttons.find((b) => b.id === ev.groupName)) {
            alert(`Grupo já está criado:${ev.groupName} - ${ev.groupTopic}`);
            return;
          }
          setButtons((prev) => [
            ...prev,
            {
              id: ev.groupName,
              status: "grupo",
            },
          ]);

          setConversation((prev) => [
            ...prev,
            { id: ev.groupName, topic: ev.groupTopic, messages: [] },
          ]);
        } else if (ev.type === "group_removed") {
          if (buttons.find((b) => b.id === ev.groupName)) {
            const buttonsRemoved = buttons.filter((b) => b.id !== ev.groupName);
            setButtons(buttonsRemoved);
          }
        } else if (ev.type === "group_message_received") {
          console.log("aaaaaaaaaaaaaaaa", ev);
          const existingConversation = conversation.find(
            (c) => c.topic === ev.topicGroup
          );
          if (existingConversation) {
            const newMessage = {
              author: ev.from,
              TimeStamp: ev.timestamp,
              text: ev.content,
            };

            setConversation((prev) =>
              prev.map((c) =>
                c.topic === ev.topicGroup
                  ? { ...c, messages: [...(c.messages ?? []), newMessage] }
                  : c
              )
            );

            // Atualiza a conversa atualmente aberta
            setSelectedConversation((prev) =>
              prev && prev.topic === ev.topicGroup
                ? {
                    ...prev,
                    messages: [...(prev.messages ?? []), newMessage],
                  }
                : prev
            );
          } else {
            //Se chegar mensagem e nao existir, cria nova
            const newMessage = {
              author: ev.from,
              TimeStamp: ev.timestamp,
              text: ev.content,
            };

            const newConversation = {
              id: ev.from,
              topic: ev.topicGroup,
              messages: [newMessage],
            };

            // adiciona botão da conversa
            setButtons((prev) => [
              ...prev,
              {
                id: ev.from,
                status: "",
              },
            ]);

            // adiciona conversa nova
            setConversation((prev) => [...prev, newConversation]);
          }
        }
      }

      newChatService?.pingStatusPresence(); //Fica inscrevendo nos status para obter os status
    }, 1000);
    return () => clearInterval(interval);
  }, [newChatService, conversation.find, conversation]);

  // Seleciona ou cria conversa
  function loadConversation(id: string) {
    if (id) {
      const conv = conversation.find((c) => c.id === id);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }

  //Aqui vamos setar o número de telefone
  async function setMyNumberTelephone(number: string) {
    const mqttService = new MqttService({
      clientId: number,
      brokerHost: "localhost",
      brokerPort: 9001,
      useSSL: false,
    });
    setMqttService(mqttService);
    if (mqttService === undefined) {
      return;
    }

    const chatService = new NewChatService(mqttService);
    setNewChatService(chatService);

    await mqttService.connect();
    await chatService.initialize();
  }

  function setNewConversation(userId: string, topic: string) {
    const mappedStateConversations = conversation.map((c) => ({
      userId: c.id,
      topic: c.topic,
      chatIndividual: true, // ou false, depende da sua lógica
      timestamp: new Date().toISOString(),
    }));

    const newConversation = {
      userId: userId,
      topic: topic,
      chatIndividual: true,
      timestamp: new Date().toISOString(),
    };

    const conversationsToSend = [...mappedStateConversations, newConversation];

    const payload: LoadConversations = {
      type: "load_conversation",
      conversations: conversationsToSend,
    };

    newChatService?.setConversations(payload);
  }

  return (
    <>
      <ModalPhoneDrawer
        open={visibleModalPhoneDrawer}
        onClose={() => setVisibleModalPhoneDrawer(false)}
        onConfirm={(numberTelephone) => setMyNumberTelephone(numberTelephone)}
      />
      <AppTopBar
        onCleanCLick={() => {
          newChatService?.cleanConversations();
          newChatService?.cleanListGroups(listGroups);
          setListGroups([]);
        }}
        onMenuClick={() => setPositionMenu(!positionMenu)}
        onLoginCLick={() => setVisibleModalPhoneDrawer(true)}
        onDesconectClick={() => {
          newChatService?.setStatusDisconnect();
        }}
      />
      <SideAppBar
        open={positionMenu}
        buttons={buttons}
        onSelect={(id) => loadConversation(id)}
        newChatService={newChatService}
        listGroups={listGroups}
      />
      <ChatWindow
        sx={{
          marginTop: "8px",
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : 0, // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
        messages={selectedConversation}
      />{" "}
      <ChatInput
        chatConversationService={(textmsg) => {
          if (selectedConversation.id == "0" || selectedConversation.id == "") {
            alert("Necessário selecionar uma conversa para enviar");
            return;
          }

          const newMessage = {
            author: "Você",
            TimeStamp: new Date().toISOString(),
            text: textmsg,
          };

          // Atualiza lista de conversas
          setConversation((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, messages: [...(c.messages ?? []), newMessage] }
                : c
            )
          );

          // Atualiza também a conversa selecionada (nova referência!)
          setSelectedConversation((prev) =>
            prev
              ? { ...prev, messages: [...(prev.messages ?? []), newMessage] }
              : prev
          );

          if (selectedConversation.topic.startsWith("group/chat/")) {
            newChatService?.sendGroupMessage(
              selectedConversation.topic,
              selectedConversation.id,
              textmsg
            );
          } else {
            newChatService?.sendMessage(selectedConversation.topic, textmsg);
          }
        }}
        sx={{
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : "100", // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
      />
      {
        //definimos qual modal de aceite aparecerá
        infoAcceptDialog.groupName ? (
          <AcceptDialogGroup
            invite={
              infoAcceptDialog
                ? {
                    from: infoAcceptDialog.from,
                    requestId: infoAcceptDialog.requestId,
                    timestamp: infoAcceptDialog.timestamp,
                    groupName: infoAcceptDialog.groupName,
                  }
                : null
            }
            onAccept={() => {
              const selectGroup = listGroups.find(
                (g) => g.groupName === infoAcceptDialog.groupName
              );
              newChatService?.approveJoinRequest(
                selectGroup,
                infoAcceptDialog.requestId
              );
              setInfoAcceptDialog({
                from: "",
                requestId: "",
                timestamp: "",
                groupName: "",
              });
            }}
            onReject={() => {}}
            onClose={() =>
              setInfoAcceptDialog({
                from: "",
                requestId: "",
                timestamp: "",
                groupName: "",
              })
            }
          />
        ) : (
          <AcceptDialog
            invite={
              infoAcceptDialog
                ? {
                    from: infoAcceptDialog.from,
                    requestId: infoAcceptDialog.requestId,
                    timestamp: infoAcceptDialog.timestamp,
                  }
                : null
            }
            onAccept={() => {
              if (!newChatService) return;
              const topics = newChatService?.acceptInvite(
                infoAcceptDialog.requestId,
                infoAcceptDialog.from
              );
              newChatService.subscribeToChatTopic(topics);
              setNewConversation(infoAcceptDialog.from, topics);
              setConversation((prev) => [
                ...prev,
                { id: infoAcceptDialog.from, topic: topics, messages: [] },
              ]);
            }}
            onReject={() =>
              newChatService?.rejectInvite(
                infoAcceptDialog.requestId,
                infoAcceptDialog.from
              )
            }
            onClose={() =>
              setInfoAcceptDialog({
                from: "",
                requestId: "",
                timestamp: "",
                groupName: "",
              })
            }
            //INSERIR A FUNÇÃO PARA CRIAR O NOVO CHAT AQUI QUANDO ACEITO - PQ NAO TEMOS EVENTO PARA ACEITAR
            onNewChat={() => {
              setButtons((prev) => [
                ...prev,
                {
                  id: infoAcceptDialog.from,
                  status: "online", // ou "offline" se preferir
                },
              ]);
            }}
          />
        )
      }
    </>
  );
}
