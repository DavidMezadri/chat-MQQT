import { MqttService } from "./MqttService";

/**
 * Estrutura de uma mensagem de chat
 */
export interface ChatMessage {
  from: string;
  text: string;
  timestamp: string;
  messageId: string;
}

/**
 * Callback chamado quando uma mensagem é recebida
 * Agora recebe também o tópico de onde veio a mensagem
 */
export type OnMessageReceivedCallback = (
  message: ChatMessage,
  topic: string
) => void;

/**
 * Callback chamado quando você entra em uma conversa
 */
export type OnJoinedChatCallback = (chatTopic: string) => void;

/**
 * Callback chamado quando você sai de uma conversa
 */
export type OnLeftChatCallback = (chatTopic: string) => void;

/**
 * Estrutura que armazena informações de cada conversa ativa
 */
interface ActiveChat {
  topic: string; // Nome do tópico
  messageHistory: ChatMessage[]; // Histórico de mensagens deste tópico
  callbacks: OnMessageReceivedCallback[]; // Callbacks específicos deste tópico
}

/**
 * Classe responsável por gerenciar MÚLTIPLAS conversas de chat simultaneamente
 */
export class ChatConversationService {
  private mqttService: MqttService;
  private userId: string;

  // 🔑 MUDANÇA PRINCIPAL: Map para armazenar múltiplas conversas
  // Cada tópico tem seu próprio histórico e callbacks
  private activeChats: Map<string, ActiveChat> = new Map();

  // Callbacks globais (chamados para QUALQUER mensagem de QUALQUER tópico)
  private globalMessageCallbacks: OnMessageReceivedCallback[] = [];
  private onJoinedChatCallbacks: OnJoinedChatCallback[] = [];
  private onLeftChatCallbacks: OnLeftChatCallback[] = [];

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
  }

  /**
   * 📫 NOVO MÉTODO: Assina o próprio tópico para receber mensagens pessoais
   * @param myTopic - Seu tópico pessoal (ex: "user/joao/inbox")
   * @param callback - Função chamada quando receber mensagem neste tópico
   */
  subscribeToMyTopic(
    myTopic: string,
    callback?: OnMessageReceivedCallback
  ): void {
    // Reutiliza a lógica do joinChat
    this.joinChat(myTopic, callback);
    console.log(`📫 [${this.userId}] Inscrito no próprio tópico: ${myTopic}`);
  }

  /**
   * 💬 MODIFICADO: Entra em uma conversa (pode entrar em várias ao mesmo tempo)
   * @param chatTopic - Tópico da conversa
   * @param callback - Callback ESPECÍFICO para este tópico (opcional)
   */
  joinChat(chatTopic: string, callback?: OnMessageReceivedCallback): void {
    // Verifica se já está inscrito neste tópico
    if (this.activeChats.has(chatTopic)) {
      console.log(`ℹ️ [${this.userId}] Já está inscrito em: ${chatTopic}`);

      // Se passou um novo callback, adiciona à lista
      if (callback) {
        const chat = this.activeChats.get(chatTopic)!;
        chat.callbacks.push(callback);
        console.log(`➕ [${this.userId}] Callback adicional registrado`);
      }
      return;
    }

    // Cria nova entrada no Map de conversas ativas
    const newChat: ActiveChat = {
      topic: chatTopic,
      messageHistory: [],
      callbacks: callback ? [callback] : [],
    };

    this.activeChats.set(chatTopic, newChat);

    // Inscreve-se no tópico MQTT
    // IMPORTANTE: Agora passa o TOPIC para o handler
    this.mqttService.subscribe(chatTopic, (topic, payload) => {
      this.handleMessageReceived(topic, payload);
    });

    console.log(`💬 [${this.userId}] Entrou na conversa: ${chatTopic}`);

    // Notifica callbacks globais
    this.onJoinedChatCallbacks.forEach((cb) => cb(chatTopic));

    // Envia mensagem de sistema
    this.sendSystemMessage(chatTopic, `${this.userId} entrou na conversa`);
  }

  /**
   * 👋 MODIFICADO: Sai de uma conversa ESPECÍFICA (não de todas)
   * @param chatTopic - Tópico da conversa para sair
   */
  leaveChat(chatTopic: string): void {
    const chat = this.activeChats.get(chatTopic);

    if (!chat) {
      console.warn(`⚠️ [${this.userId}] Não está inscrito em: ${chatTopic}`);
      return;
    }

    // Envia mensagem de sistema antes de sair
    this.sendSystemMessage(chatTopic, `${this.userId} saiu da conversa`);

    // Desinscreve-se do tópico MQTT
    this.mqttService.unsubscribe(chatTopic);

    // Remove do Map de conversas ativas
    this.activeChats.delete(chatTopic);

    console.log(`👋 [${this.userId}] Saiu da conversa: ${chatTopic}`);

    // Notifica callbacks
    this.onLeftChatCallbacks.forEach((cb) => cb(chatTopic));
  }

  /**
   * 🚪 NOVO MÉTODO: Sai de TODAS as conversas ativas
   */
  leaveAllChats(): void {
    const topics = Array.from(this.activeChats.keys());
    console.log(`🚪 [${this.userId}] Saindo de ${topics.length} conversas...`);

    topics.forEach((topic) => this.leaveChat(topic));
  }

  /**
   * 📨 MODIFICADO: Processa mensagem recebida
   * Agora sabe de qual tópico veio a mensagem
   */
  private handleMessageReceived(topic: string, payload: string): void {
    try {
      const message: ChatMessage = JSON.parse(payload);
      const chat = this.activeChats.get(topic);

      if (!chat) {
        console.warn(
          `⚠️ [${this.userId}] Mensagem de tópico não inscrito: ${topic}`
        );
        return;
      }

      // Adiciona ao histórico DESTE tópico específico
      chat.messageHistory.push(message);

      // Não notifica suas próprias mensagens (opcional)
      if (message.from === this.userId) {
        return;
      }

      console.log(
        `📨 [${this.userId}] ${topic} - ${message.from}: ${message.text}`
      );

      // 1️⃣ Chama callbacks ESPECÍFICOS deste tópico
      chat.callbacks.forEach((callback) => {
        callback(message, topic);
      });

      // 2️⃣ Chama callbacks GLOBAIS (recebem mensagens de qualquer tópico)
      this.globalMessageCallbacks.forEach((callback) => {
        callback(message, topic);
      });
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem de ${topic}:`, error);
    }
  }

  /**
   * 📤 NOVO MÉTODO: Envia mensagem para um tópico ESPECÍFICO
   * @param topic - Tópico de destino
   * @param text - Texto da mensagem
   * @returns messageId ou null se não estiver inscrito
   */
  sendMessageToTopic(topic: string, text: string): string | null {
    if (!this.activeChats.has(topic)) {
      console.error(`❌ [${this.userId}] Não está inscrito em: ${topic}`);
      return null;
    }

    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: ChatMessage = {
      from: this.userId,
      text,
      timestamp: new Date().toISOString(),
      messageId,
    };

    // Publica no tópico específico
    this.mqttService.publish(topic, message);

    // Adiciona ao histórico local
    this.activeChats.get(topic)!.messageHistory.push(message);

    console.log(`📤 [${this.userId}] ${topic}: ${text}`);

    return messageId;
  }

  /**
   * 📤 MANTIDO: Envia mensagem na "conversa atual" (compatibilidade)
   * Agora envia para TODOS os tópicos ativos (ou pode escolher o primeiro)
   */
  sendMessage(text: string): string | null {
    const topics = Array.from(this.activeChats.keys());

    if (topics.length === 0) {
      console.error(`❌ [${this.userId}] Não está em nenhuma conversa`);
      return null;
    }

    // Opção 1: Envia para o primeiro tópico
    const firstTopic = topics[0];
    return this.sendMessageToTopic(firstTopic, text);

    // Opção 2: Envia para TODOS os tópicos (descomente se preferir)
    // topics.forEach(topic => this.sendMessageToTopic(topic, text));
    // return `msg_${Date.now()}`;
  }

  /**
   * 💬 MODIFICADO: Envia mensagem de sistema para tópico específico
   */
  private sendSystemMessage(topic: string, text: string): void {
    if (!this.activeChats.has(topic)) {
      return;
    }

    const message: ChatMessage = {
      from: "SYSTEM",
      text,
      timestamp: new Date().toISOString(),
      messageId: `sys_${Date.now()}`,
    };

    this.mqttService.publish(topic, message);
  }

  /**
   * ⌨️ MODIFICADO: Envia typing indicator para tópico específico
   */
  sendTypingIndicator(topic: string): void {
    if (!this.activeChats.has(topic)) {
      return;
    }

    const typingTopic = `${topic}/typing`;
    this.mqttService.publish(typingTopic, {
      from: this.userId,
      isTyping: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 🔔 NOVO: Registra callback GLOBAL (recebe de TODOS os tópicos)
   */
  onMessageReceived(callback: OnMessageReceivedCallback): () => void {
    this.globalMessageCallbacks.push(callback);

    return () => {
      const index = this.globalMessageCallbacks.indexOf(callback);
      if (index > -1) {
        this.globalMessageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 🔔 NOVO: Registra callback para tópico ESPECÍFICO
   */
  onMessageReceivedFromTopic(
    topic: string,
    callback: OnMessageReceivedCallback
  ): () => void {
    const chat = this.activeChats.get(topic);

    if (!chat) {
      console.warn(`⚠️ Tópico ${topic} não está ativo`);
      return () => {};
    }

    chat.callbacks.push(callback);

    return () => {
      const index = chat.callbacks.indexOf(callback);
      if (index > -1) {
        chat.callbacks.splice(index, 1);
      }
    };
  }

  onJoinedChat(callback: OnJoinedChatCallback): () => void {
    this.onJoinedChatCallbacks.push(callback);
    return () => {
      const index = this.onJoinedChatCallbacks.indexOf(callback);
      if (index > -1) this.onJoinedChatCallbacks.splice(index, 1);
    };
  }

  onLeftChat(callback: OnLeftChatCallback): () => void {
    this.onLeftChatCallbacks.push(callback);
    return () => {
      const index = this.onLeftChatCallbacks.indexOf(callback);
      if (index > -1) this.onLeftChatCallbacks.splice(index, 1);
    };
  }

  /**
   * 📜 MODIFICADO: Retorna histórico de tópico ESPECÍFICO
   */
  getMessageHistory(topic?: string): ChatMessage[] {
    if (topic) {
      return this.activeChats.get(topic)?.messageHistory || [];
    }

    // Se não especificar tópico, retorna TODAS as mensagens
    const allMessages: ChatMessage[] = [];
    this.activeChats.forEach((chat) => {
      allMessages.push(...chat.messageHistory);
    });

    // Ordena por timestamp
    return allMessages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * 📝 NOVO: Retorna última mensagem de um tópico específico
   */
  getLastMessage(topic?: string): ChatMessage | null {
    const history = this.getMessageHistory(topic);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * 🗑️ MODIFICADO: Limpa histórico de tópico específico ou de todos
   */
  clearHistory(topic?: string): void {
    if (topic) {
      const chat = this.activeChats.get(topic);
      if (chat) {
        chat.messageHistory = [];
        console.log(`🗑️ [${this.userId}] Histórico de ${topic} limpo`);
      }
    } else {
      this.activeChats.forEach((chat) => {
        chat.messageHistory = [];
      });
      console.log(`🗑️ [${this.userId}] Todo histórico limpo`);
    }
  }

  /**
   * ✅ MODIFICADO: Verifica se está em conversa (alguma ou específica)
   */
  isInConversation(topic?: string): boolean {
    if (topic) {
      return this.activeChats.has(topic);
    }
    return this.activeChats.size > 0;
  }

  /**
   * 📋 NOVO: Lista todos os tópicos ativos
   */
  getActiveTopics(): string[] {
    return Array.from(this.activeChats.keys());
  }

  /**
   * 🔢 NOVO: Retorna quantidade de conversas ativas
   */
  getActiveChatsCount(): number {
    return this.activeChats.size;
  }

  /**
   * 📊 NOVO: Retorna quantidade de mensagens de um tópico
   */
  getMessageCount(topic?: string): number {
    if (topic) {
      return this.activeChats.get(topic)?.messageHistory.length || 0;
    }

    // Retorna total de mensagens de todos os tópicos
    let total = 0;
    this.activeChats.forEach((chat) => {
      total += chat.messageHistory.length;
    });
    return total;
  }

  /**
   * 🆔 Retorna o ID do usuário
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * 📍 MANTIDO para compatibilidade (retorna primeiro tópico ativo)
   */
  getCurrentChatTopic(): string | null {
    const topics = this.getActiveTopics();
    return topics.length > 0 ? topics[0] : null;
  }
}
