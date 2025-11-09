import { useEffect, useState } from "react";
import { AcceptDialog } from "../../components/AcceptDialog/AcceptDialog";
import AppTopBar from "../../components/AppTopBar/AppTopBar";
import ModalPhoneDrawer from "../../components/ModalPhone/ModalPhone";
import SideAppBar from "../../components/SideAppBar/SideAppBar";
import { MqttService } from "../../service/MqttService";
import { NewChatService } from "../../service/NewChatService";
import { ChatInput } from "../chat/ChatInput/ChatInput";
import { ChatWindow } from "../chat/ChatWindown/ChatWindown";

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
  const [infoAcceptDialog, setInfoAcceptDialog] = useState({ from: "", requestId: "", timestamp: "" });

  // Lista de conversas
  const [conversation, setConversation] = useState<TypeConversation[]>([
    {
      id: "",
      topic: "",
      messages: [
        { author: "", TimeStamp: new Date().toISOString(), text: "" },
      ],
    },
  ]);

  // Conversa selecionada
  const [selectedConversation, setSelectedConversation] =
    useState<TypeConversation>({
      id: "0",
      topic: "",
      messages: [{ author: "", TimeStamp: new Date().toISOString(), text: "" }],
    });

  useEffect(() => {
    const interval = setInterval(() => {
      const events = newChatService?.pollAllEvents();
      if (!events) return;
      for (const ev of events) {
        if (ev.type === "invite_received") {
          setInfoAcceptDialog({ from: ev.from, requestId: ev.requestId, timestamp: ev.timestamp });
        }

        if (ev.type === "invite_accepted") {
          setButtons((prev) => [...prev, ev.acceptedBy]);
          console.log(`${ev.acceptedBy}, TÓPICO: ${ev.chatTopic}`);
          setConversation((prev) => [
            ...prev,
            { id: ev.acceptedBy, topic: ev.chatTopic, messages: [] },
          ]);
        }

        if (ev.type === "message_received") {
          const existingConversation = conversation.find(c => c.id === ev.from);
          if (existingConversation) {
            setConversation((prev) =>
              prev.map((c) =>
                c.id === ev.from
                  ? {
                    ...c,
                    messages: [
                      ...c.messages ?? [],
                      { author: ev.from, TimeStamp: ev.timestamp, text: ev.content },
                    ],
                  }
                  : c
              )
            );
          }
          // Aqui você pode adicionar a lógica para atualizar a conversa com a nova mensagem
        }
      }

    }, 500);
    return () => clearInterval(interval);
  }, [newChatService, conversation.find, conversation]);



  // IDs dos botões na SideAppBar
  const [buttons, setButtons] = useState<string[]>([
  ]);


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
    await mqttService.connect();
    setMqttService(mqttService);
    if (mqttService === undefined) {
      return;
    }
    const chatService = new NewChatService(mqttService);
    setNewChatService(chatService);
  }

  return (
    <>
      <ModalPhoneDrawer
        open={visibleModalPhoneDrawer}
        onClose={() => setVisibleModalPhoneDrawer(false)}
        onConfirm={(numberTelephone) => setMyNumberTelephone(numberTelephone)}
      />
      <AppTopBar
        onMenuClick={() => setPositionMenu(!positionMenu)}
        onLoginCLick={() => setVisibleModalPhoneDrawer(true)}
      />


      <SideAppBar
        open={positionMenu}
        buttons={buttons}
        onSelect={(id) => loadConversation(id)}
        newChatService={newChatService}
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
        chatConversationService={(text) => {
          newChatService?.sendMessage(selectedConversation.topic, text);
        }}

        sx={{
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : "100", // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
      />
      <AcceptDialog
        invite={infoAcceptDialog ? { from: infoAcceptDialog.from, requestId: infoAcceptDialog.requestId, timestamp: infoAcceptDialog.timestamp } : null}
        onAccept={() => {
          if (!newChatService) return;
          const topics = newChatService?.acceptInvite(infoAcceptDialog.requestId, infoAcceptDialog.from);
          newChatService.subscribeToChatTopic(topics);
          setConversation((prev) => [
            ...prev,
            { id: infoAcceptDialog.from, topic: topics, messages: [] },
          ]);
        }}
        onReject={() => newChatService?.rejectInvite(infoAcceptDialog.requestId, infoAcceptDialog.from)}
        onClose={() => setInfoAcceptDialog({ from: "", requestId: "", timestamp: "" })}
        //INSERIR A FUNÇÃO PARA CRIAR O NOVO CHAT AQUI QUANDO ACEITO - PQ NAO TEMOS EVENTO PARA ACEITAR
        onNewChat={() => {
          setButtons((prev) => [...prev, infoAcceptDialog.from]);
        }}
      />
    </>
  );
}
