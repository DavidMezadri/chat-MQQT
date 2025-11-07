import { useState } from "react";
import SideAppBar from "../../components/SideAppBar/SideAppBar";
import ModalPhoneDrawer from "../../components/ModalPhone/ModalPhone";
import { ChatWindow } from "../chat/ChatWindown/ChatWindown";
import { ChatInput } from "../chat/ChatInput/ChatInput";
import { MqttService } from "../../service/MqttService";
import { ChatConversationService } from "../../service/ChatConversationService";
import AppTopBar from "../../components/AppTopBar/AppTopBar";

export interface Message {
  TimeStamp: string;
  text: string;
  author: string;
}

export interface TypeConversation {
  id: number;
  name?: string;
  Messages?: Message[];
}

export default function Conversation() {
  const [mqttService, setMqttService] = useState<MqttService>();
  const [chatConversationService, setChatConversationService] =
    useState<ChatConversationService>();
  const [positionMenu, setPositionMenu] = useState(false);
  const [visibleModalPhoneDrawer, setVisibleModalPhoneDrawer] = useState(false);

  // IDs dos botões na SideAppBar
  const [buttons, setButtons] = useState<number[]>([
    9999999999, 2899294599, 9997,
  ]);

  // Lista de conversas
  const [conversation, setConversation] = useState<TypeConversation[]>([
    {
      id: 9999999999,
      name: "João",
      Messages: [
        { author: "João", TimeStamp: new Date().toISOString(), text: "Oi!" },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Oi João, tudo bem?",
        },
      ],
    },
    {
      id: 2899294599,
      name: "Maria",
      Messages: [
        {
          author: "Maria",
          TimeStamp: new Date().toISOString(),
          text: "Tudo bem?",
        },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Tudo sim, Maria!",
        },
      ],
    },
    {
      id: 9997,
      name: "Pedro",
      Messages: [
        { author: "Pedro", TimeStamp: new Date().toISOString(), text: "Olá!" },
        {
          author: "Você",
          TimeStamp: new Date().toISOString(),
          text: "Olá Pedro!",
        },
      ],
    },
  ]);

  // Conversa selecionada
  const [selectedConversation, setSelectedConversation] =
    useState<TypeConversation>({
      id: 0,
      name: "",
      Messages: [{ author: "", TimeStamp: new Date().toISOString(), text: "" }],
    });

  // Seleciona ou cria conversa
  function loadConversation(id?: number, name?: string) {
    if (id) {
      const conv = conversation.find((c) => c.id === id);
      if (conv) {
        setSelectedConversation(conv);
        console.log("teste");
        chatConversationService?.joinChat(conv.id.toString() + "/chat");
        console.log(chatConversationService);
      }
      return;
    }

    // Criar nova conversa
    const newId = Math.floor(Math.random() * 9000) + 1000;
    const newConv: TypeConversation = {
      id: newId,
      name: name || `Contato ${newId}`,
      Messages: [],
    };
    setConversation((prev) => [...prev, newConv]);
    setButtons((prev) => [...prev, newId]);
    setSelectedConversation(newConv);
  }

  //Aqui vamos setar o número de telefone
  async function setMyNumberTelephone(number: string) {
    const entidade = new MqttService({
      clientId: number,
      brokerHost: "localhost",
      brokerPort: 9001,
      useSSL: false,
    });
    await entidade.connect();
    setMqttService(entidade);
    if (entidade === undefined) {
      return;
    }
    const chatService = new ChatConversationService(entidade);
    setChatConversationService(chatService);
    chatConversationService?.joinMyTopic(number + "/chat");
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
        chatConversationService={chatConversationService}
        sx={{
          width: positionMenu ? "calc(100 - 240px)" : "100", // diminui quando sidebar aberta
          marginLeft: positionMenu ? "240px" : "100", // empurra à direita
          transition: "width 0.3s ease, margin-left 0.3s ease",
        }}
      />
    </>
  );
}
