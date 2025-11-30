import type { MqttService } from "./MqttService";

// ============================================================================
// MENSAGENS DE CONTROLE (Classificação de HAndlers)
// ============================================================================

export interface InviteRequest {
  type: "invite_received";
  from: string;
  requestId: string;
  timestamp: string;
}

export interface InviteAccept {
  type: "invite_accepted";
  from: string;
  to: string;
  chatTopic: string;
  requestId: string;
  timestamp: string;
}

export interface InviteReject {
  type: "invite_rejected";
  from: string;
  to: string;
  requestId: string;
  timestamp: string;
}

export interface ChatMessage {
  type: "message";
  from: string;
  content: string;
  messageId: string;
  chatTopic: string;
  timestamp: string;
}

export type ControlMessage = InviteRequest | InviteAccept | InviteReject;

// ============================================================================
// EVENTOS DO SERVIÇO
// ============================================================================

export interface InviteReceivedEvent {
  type: "invite_received";
  from: string;
  requestId: string;
  timestamp: string;
}

export interface InviteAcceptedEvent {
  type: "invite_accepted";
  acceptedBy: string;
  chatTopic: string;
  requestId: string;
  timestamp: string;
}

export interface InviteRejectedEvent {
  type: "invite_rejected";
  rejectedBy: string;
  requestId: string;
  timestamp: string;
}

export interface MessageReceivedEvent {
  type: "message_received";
  from: string;
  content: string;
  messageId: string;
  chatTopic: string;
  timestamp: string;
}

export interface ChatSubscribedEvent {
  type: "chat_subscribed";
  chatTopic: string;
  timestamp: string;
}

export interface PresenceUpdateEvent {
  type: "presence_update";
  userId: string;
  status: "online" | "offline";
  timestamp: string;
}

export interface LoadConversations {
  type: "load_conversation";
  conversations: {
    userId: string;
    topic: string;
    chatIndividual: boolean;
    timestamp: string;
  }[];
}

export interface ErrorEvent {
  type: "error";
  error: string;
  context?: any;
  timestamp: string;
}

export type ChatServiceEvent =
  | InviteReceivedEvent
  | InviteAcceptedEvent
  | InviteRejectedEvent
  | MessageReceivedEvent
  | InviteAccept
  | ChatSubscribedEvent
  | PresenceUpdateEvent
  | LoadConversations
  | ErrorEvent;

// ============================================================================
// INFORMACOES DE GRUPO
// ============================================================================

export interface GroupInfo {
  groupId: string;
  groupName: string;
  adminId: string;
  memberCount: number;
  createdAt: string;
}

// ============================================================================
// EVENTOS GRUPO E TIPO DE MENSAGENS
// ============================================================================

export interface GroupCreatedEvent {
  type: "group_created";
  groupId: string;
  groupName: string;
  groupTopic: string;
  adminId: string;
  controlAdminTopic: string;
  memberCount: number;
  members: string[];
  createdAt: string;
}

export interface GroupJoinRequestEvent {
  type: "group_join_request";
  groupId: string;
  userRequestId: string;
  groupName: string;
  adminId: string;
  controlAdminTopic: string;
  memberCount: number;
  members: string[];
  createdAt: string;
}

export interface GroupJoinApprovedEvent {
  type: "group_join_approved";
  userRequestId: string;
  approvedBy: string;
  groupId: string;
  userId: string;
  groupName: string;
  groupTopic: string;
  adminId: string;
  controlAdminTopic: string;
  timestamp: string;
}

export interface GroupJoinRejectedEvent {
  type: "group_join_rejected";
  userRequestId: string;
  repprovedBy: string;
  groupId: string;
  userId: string;
  groupName: string;
  adminId: string;
  controlAdminTopic: string;
  timestamp: string;
}

export interface GroupMessageReceivedEvent {
  type: "group_message_received";
  groupId: string;
  from: string;
  topicGroup: string;
  content: string;
  messageId: string;
  timestamp: string;
}

//Listar Grupos
export interface GroupDiscoveredEvent {
  type: "group_discovered";
  groupId: string;
  groupName: string;
  adminId: string;
  controlAdminTopic: string;
  memberCount: number;
  members: string[];
  createdAt: string;
}
export interface GroupRemovedEvent {
  type: "group_removed";
  groupId: string;
  groupName: string;
}

export interface GroupErrorEvent {
  type: "group_error";
  error: string;
  context?: any;
  timestamp: string;
}

export type GroupServiceEvent =
  | GroupCreatedEvent
  | GroupJoinRequestEvent
  | GroupJoinApprovedEvent
  | GroupJoinRejectedEvent
  | GroupMessageReceivedEvent
  | GroupDiscoveredEvent
  | GroupRemovedEvent
  | GroupErrorEvent;

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

export class NewChatService {
  private mqttService: MqttService;
  private userId: string;
  private controlTopic: string;
  private presenceTopic: string;
  private presenceTopicOthers: string;
  private loadConversation: string;
  private groupListTopic: string;
  // Fila de eventos
  private eventQueue: (GroupServiceEvent | ChatServiceEvent)[] = [];

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
    this.controlTopic = `control/${this.userId}`;
    this.presenceTopic = `presence/${this.userId}`;
    this.presenceTopicOthers = `presence`;
    this.loadConversation = `control/loadconversation/${this.userId}`;
    this.groupListTopic = `group/list`;

    this.setupPresenceListener();
  }

  // ==========================================================================
  // SETUP INICIAL
  // ==========================================================================

  async initialize() {
    this.loadConversations();
    this.setupControlChannel();
    this.setOnlineStatus();
    this.startListingGroups();
  }

  private setupControlChannel(): void {
    this.mqttService.subscribe(
      this.controlTopic,
      (_topic, payload) => {
        try {
          const message: ControlMessage = JSON.parse(payload);
          this.handleControlMessage(message);
        } catch (error) {
          this.pushEvent({
            type: "error",
            error: "Erro ao processar mensagem de controle",
            context: { payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      },
      1
    );

    console.log(`🎧 [${this.userId}] Canal de controle: ${this.controlTopic}`);
  }

  private loadConversations(): void {
    // retain: true = mantém o último estado no broker
    this.mqttService.subscribe(this.loadConversation, () => {}, 1);

    console.log(`👤 [${this.userId}] Carregar Conversas`);
  }

  // ==========================================================================
  // Publicação de Status
  // ==========================================================================

  private setOnlineStatus(): void {
    const presenceMessage = {
      userId: this.userId,
      status: "online",
      timestamp: new Date().toISOString(),
    };

    // retain: true = mantém o último estado no broker
    this.mqttService.publish(this.presenceTopic, presenceMessage, 1, true);
    this.mqttService.subscribe(`${this.presenceTopicOthers}/#`, () => {}, 1);

    console.log(`👤 [${this.userId}] Status: ONLINE`);
  }

  public pingStatusPresence() {
    this.mqttService.subscribe(`${this.presenceTopicOthers}/#`, () => {}, 1);
  }

  private setOfflineStatus(): void {
    const presenceMessage = {
      userId: this.userId,
      status: "offline",
      timestamp: new Date().toISOString(),
    };

    // retain: true = Atualiza última mensagem no broker
    this.mqttService.publish(this.presenceTopic, presenceMessage, 1, true);
  }

  //✅ Marca como offline

  setStatusDisconnect(): void {
    this.setOfflineStatus();
  }

  //✅ Marca como online

  setStatusConnect(): void {
    this.setOfflineStatus();
    // ... resto do código de desconexão
  }

  // ==========================================================================
  // Listener para presence
  // ==========================================================================

  private setupPresenceListener(): void {
    // Captura TODAS as mensagens
    this.mqttService.setGlobalMessageHandler((topic, payload) => {
      //Captura mensagem topic presence
      if (topic.startsWith(this.presenceTopicOthers)) {
        try {
          const presence = JSON.parse(payload);
          //Se for presenca do propio usuario retorna
          if (presence.userId === this.userId) return;

          this.eventQueue.push({
            type: "presence_update",
            userId: presence.userId,
            status: presence.status,
            timestamp: presence.timestamp,
          });
        } catch (error) {
          this.eventQueue.push({
            type: "error",
            error: "Erro ao processar presença",
            context: { topic, payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      }
      // Carregar conversas
      if (topic.startsWith(this.loadConversation)) {
        try {
          const conversarion = JSON.parse(payload);
          const loadEvent: LoadConversations = {
            type: "load_conversation",
            conversations: conversarion.conversations.map((item: any) => ({
              userId: item.userId,
              topic: item.topic,
              chatIndividual: item.chatIndividual,
              timestamp: item.timestamp,
            })),
          };
          this.eventQueue.push(loadEvent);
        } catch (error) {
          this.eventQueue.push({
            type: "error",
            error: "Erro ao processar presença",
            context: { topic, payload, error },
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (topic.startsWith("chat/")) {
        const message = JSON.parse(payload);
        if (message.from === this.userId) {
          return;
        }
        this.pushEvent({
          type: "message_received",
          from: message.from,
          content: message.content,
          messageId: message.messageId,
          chatTopic: message.chatTopic,
          timestamp: message.timestamp,
        });

        console.log(
          `💬 [${this.userId}] Mensagem de ${message.from}: ${message.content}`
        );
      }

      try {
        // Mensagens de CONTROLE (pedidos de entrada, aprovações, rejeições)
        if (topic.startsWith(this.controlTopic)) {
          const message = JSON.parse(payload);
          //console.log("handler", message);
          if (message.type === "group_join_request") {
            this.eventQueue.push({
              type: "group_join_request",
              groupId: message.groupId,
              userRequestId: message.userRequestId,
              controlAdminTopic: message.controlAdminTopic,
              adminId: message.adminId,
              groupName: message.groupName,
              memberCount: message.memberCount,
              members: message.members,
              createdAt: message.createdAt,
            });
          } else if (message.type === "group_join_approved") {
            console.log(
              "Isncrito no grupo Topico",
              `group/chat/${message.groupId}`
            );
            // Inscreve automaticamente no grupo
            this.mqttService.subscribe(
              `group/chat/${message.groupId}`,
              undefined,
              1
            );
            this.eventQueue.push({
              type: "group_join_approved",
              approvedBy: message.userId,
              groupId: message.groupId,
              userId: message.userId,
              groupName: message.groupName,
              groupTopic: message.groupTopic,
              adminId: message.userId,
              controlAdminTopic: message.controlAdminTopic,
              userRequestId: message.userRequestId,
              timestamp: message.timestamp,
            });
          } else if (message.type === "group_join_rejection") {
            this.eventQueue.push({
              type: "group_join_rejected",
              repprovedBy: message.userId,
              groupId: message.groupId,
              userId: message.userId,
              groupName: message.groupName,
              adminId: message.userId,
              controlAdminTopic: message.controlAdminTopic,
              userRequestId: message.userRequestId,
              timestamp: message.timestamp,
            });
          }
        }

        // Mensagens de CHAT do grupo
        else if (topic.startsWith("group/chat")) {
          const message: GroupMessageReceivedEvent = JSON.parse(payload);
          console.log("Recebendo mensagem no Handler, ", message);

          // Ignora próprias mensagens
          if (message.from === this.userId) return;

          this.eventQueue.push({
            type: "group_message_received",
            groupId: message.groupId,
            from: message.from,
            topicGroup: message.topicGroup,
            content: message.content,
            messageId: message.messageId,
            timestamp: message.timestamp,
          });
        }

        // Listagem de Grupos, adicionar ou remover
        else if (topic.startsWith(this.groupListTopic)) {
          //console.log(topic, payload);
          const ad: GroupDiscoveredEvent = JSON.parse(payload);
          const rm: GroupRemovedEvent = JSON.parse(payload);
          if (ad.type === "group_discovered") {
            this.eventQueue.push({
              type: "group_discovered",
              controlAdminTopic: ad.controlAdminTopic,
              groupId: ad.groupId,
              groupName: ad.groupName,
              adminId: ad.adminId,
              memberCount: ad.memberCount,
              members: ad.members,
              createdAt: ad.createdAt,
            });
          }
          if (rm.type === "group_removed") {
            this.eventQueue.push({
              type: "group_removed",
              groupId: ad.groupId,
              groupName: ad.groupName,
            });
          }
        }
      } catch (error) {
        this.eventQueue.push({
          type: "group_error",
          error: "Erro ao processar mensagem de grupo",
          context: { topic, payload, error },
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // ==========================================================================
  // CARREGAR E SALVAR CONVERSAS E GRUPOS
  // ==========================================================================

  public setConversations(conversations: LoadConversations): void {
    const conversation = {
      type: conversations.type,
      conversations: conversations.conversations.map((c) => ({
        userId: c.userId,
        topic: c.topic,
        chatIndividual: c.chatIndividual,
        timestamp: c.timestamp,
      })),
    };

    // retain: true = mantém a última versão no broker
    this.mqttService.publish(this.loadConversation, conversation, 1, true);

    console.log(`👤 [${this.userId}] publicado conversas`, conversation);
  }

  public cleanConversations(): void {
    const conversation = "";
    this.mqttService.publish(this.loadConversation, conversation, 1, true);
  }

  // ==========================================================================
  // PROCESSAMENTO DE MENSAGENS DE CONTROLE
  // ==========================================================================

  private handleControlMessage(message: ControlMessage | ChatMessage): void {
    //console.log("Tipo da Mensagem no HANDLER", message.type);
    switch (message.type) {
      case "invite_received":
        this.handleInviteReceived(message);
        break;
      case "invite_accepted":
        this.handleInviteAccepted(message);
        break;
      case "invite_rejected":
        this.handleInviteRejected(message);
        break;
    }
  }

  private handleInviteReceived(message: InviteRequest): void {
    console.log(`📨 [${this.userId}] Convite recebido de ${message.from}`);

    this.pushEvent({
      type: "invite_received",
      from: message.from,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleInviteAccepted(message: InviteAccept): void {
    message.chatTopic = this.createChatTopic(message.from, this.userId);
    console.log(`✅ [${this.userId}] Convite aceito por ${message.from}`);
    console.log(`📍 [${this.userId}] Novo chat: ${message.chatTopic}`);

    // Automaticamente se inscreve no novo chat
    this.subscribeToChatTopic(message.chatTopic);

    this.pushEvent({
      type: "invite_accepted",
      acceptedBy: message.from,
      chatTopic: message.chatTopic,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  private handleInviteRejected(message: InviteReject): void {
    console.log(`❌ [${this.userId}] Convite rejeitado por ${message.from}`);

    this.pushEvent({
      type: "invite_rejected",
      rejectedBy: message.from,
      requestId: message.requestId,
      timestamp: message.timestamp,
    });
  }

  // ==========================================================================
  // ENVIO DE CONVITES
  // ==========================================================================

  /**
   * Envia convite para outro usuário
   * O convite é enviado para o tópico de controle padrão do destinatário
   */
  sendInvite(targetUserId: string, userId = this.userId): string {
    const requestId = `invite_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const inviteMessage: InviteRequest = {
      type: "invite_received",
      from: userId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia para tópico padrão do destinatário
    const targetControlTopic = `control/${targetUserId}`;
    this.mqttService.publish(targetControlTopic, inviteMessage, 1);

    console.log(
      `📤 [${this.userId}] Convite enviado para com QOS 1 ${targetUserId}`
    );
    console.log(`🆔 Request ID: ${requestId}`);

    return requestId;
  }

  // ==========================================================================
  // RESPOSTA A CONVITES
  // ==========================================================================

  /*
   * Aceita um convite recebido
   */
  acceptInvite(requestId: string, fromUserId: string): string {
    // Cria tópico único para o chat
    const chatTopic = this.createChatTopic(fromUserId, this.userId);

    const acceptMessage: InviteAccept = {
      type: "invite_accepted",
      from: this.userId,
      to: fromUserId,
      chatTopic,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia aceite para o tópico de controle do remetente original
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, acceptMessage);

    console.log(`✅ [${this.userId}] Convite aceito!`);
    console.log(`📍 [${this.userId}] Chat criado: ${chatTopic}`);

    return chatTopic;
  }

  /**
   * Rejeita um convite recebido
   * Envia a resposta para o remetente original
   */
  rejectInvite(requestId: string, fromUserId: string): void {
    const rejectMessage: InviteReject = {
      type: "invite_rejected",
      from: this.userId,
      to: fromUserId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia rejeição para o tópico de controle do remetente original
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, rejectMessage);

    console.log(`❌ [${this.userId}] Convite rejeitado`);
  }

  // ==========================================================================
  // GERENCIAMENTO DE CHATS
  // ==========================================================================

  /**
   * Se inscreve em um tópico de chat para receber mensagens
   */
  subscribeToChatTopic(chatTopic: string): void {
    this.mqttService.subscribe(chatTopic, () => {}, 1);

    this.pushEvent({
      type: "chat_subscribed",
      chatTopic,
      timestamp: new Date().toISOString(),
    });

    console.log(`🔔 [${this.userId}] Inscrito no chat: ${chatTopic}`);
  }

  // ==========================================================================
  // ENVIO DE MENSAGENS
  // ==========================================================================

  /*
   * Envia mensagem para um chat específico
   */
  sendMessage(chatTopic: string, content: string): string {
    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: ChatMessage = {
      type: "message",
      from: this.userId,
      content,
      messageId,
      chatTopic: chatTopic,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(chatTopic, message, 1);

    console.log(`📨 [${this.userId}] Mensagem enviada para ${chatTopic}`);

    return messageId;
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  /**
   * Cria tópico único para conversa entre dois usuários
   * Ordena os IDs para garantir o mesmo tópico independente de quem convida
   */
  private createChatTopic(user1: string, user2: string): string {
    const sortedUsers = [user1, user2].sort();
    return `chat/${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  // ==========================================================================
  // CRIAR GRUPO
  // ==========================================================================

  createGroup(groupName: string): string {
    const groupId = `group_${groupName}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const groupTopic = `group/chat/${groupId}`;
    const createdAt = new Date().toISOString();

    // Publica anúncio com RETAIN
    const ad: GroupDiscoveredEvent = {
      type: "group_discovered",
      groupId,
      groupName,
      adminId: this.userId,
      controlAdminTopic: this.controlTopic,
      memberCount: 1,
      members: [],
      createdAt,
    };

    this.mqttService.publish(`${this.groupListTopic}/${groupId}`, ad, 1, true);

    // Inscreve no grupo
    this.mqttService.subscribe(groupTopic, undefined, 1);

    this.eventQueue.push({
      type: "group_created",
      groupId,
      groupName,
      groupTopic,
      adminId: this.userId,
      controlAdminTopic: this.controlTopic,
      memberCount: 1,
      members: [],
      createdAt,
    });

    console.log(`🏢 [${this.userId}] Grupo criado: ${groupName}`);
    return groupId;
  }

  // ==========================================================================
  // LISTAR GRUPOS
  // ==========================================================================

  startListingGroups(): void {
    this.mqttService.subscribe("group/list/#", undefined, 1);
    console.log(`📋 [${this.userId}] Listando grupos...`);
  }

  // ==========================================================================
  // PEDIR ENTRADA NO GRUPO
  // ==========================================================================

  requestJoinGroup(group: GroupJoinRequestEvent): void {
    const request: GroupJoinRequestEvent = {
      type: "group_join_request",
      groupId: group.groupId,
      userRequestId: this.userId,
      controlAdminTopic: group.controlAdminTopic,
      adminId: group.adminId,
      groupName: group.groupName,
      memberCount: group.memberCount,
      members: group.members,
      createdAt: new Date().toISOString(),
    };

    this.mqttService.publish(group.controlAdminTopic, request, 1);

    console.log(
      `📤 [${this.userId}] Pedido enviado para ${group.adminId} para entrada no grupo ${group.groupName}`
    );
  }

  // ==========================================================================
  // APROVAR ENTRADA (ADMIN)
  // ==========================================================================

  approveJoinRequest(
    group?: GroupDiscoveredEvent,
    userRequestId?: string
  ): void {
    if (group === undefined || userRequestId === undefined) {
      return;
    }
    const approved: GroupJoinApprovedEvent = {
      type: "group_join_approved",
      approvedBy: this.userId,
      groupId: group.groupId,
      userId: this.userId,
      groupName: group.groupName,
      groupTopic: `group/chat/${group.groupId}`,
      adminId: this.userId,
      controlAdminTopic: group.controlAdminTopic,
      userRequestId: userRequestId,
      timestamp: new Date().toISOString(),
    };
    //Envia para o requisitante
    this.mqttService.publish(`control/${userRequestId}`, approved, 1);

    //Admin atualiza status do grupo
    const groupDiscovered: GroupDiscoveredEvent = {
      ...approved,
      type: "group_discovered",
      members: [...group.members, userRequestId],
      memberCount: group.memberCount + 1,
      createdAt: approved.timestamp,
    };

    this.mqttService.publish(
      `${this.groupListTopic}/${group.groupId}`,
      groupDiscovered,
      1,
      true
    );

    console.log(
      `✅ [${this.userId}] Aprovado ${userRequestId} no grupo ${group.groupName}`,
      approved
    );
  }

  // ==========================================================================
  // REJEITAR ENTRADA (ADMIN)
  // ==========================================================================

  rejectJoinRequest(group?: GroupJoinRequestEvent): void {
    if (group === undefined) {
      return;
    }
    const rejection: GroupJoinRejectedEvent = {
      type: "group_join_rejected",
      repprovedBy: this.userId,
      groupId: group.groupId,
      userId: this.userId,
      groupName: group.groupName,
      adminId: this.userId,
      controlAdminTopic: group.controlAdminTopic,
      userRequestId: group.userRequestId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(
      `group/control/${group.userRequestId}`,
      rejection,
      1
    );

    console.log(
      `❌ [${this.userId}] Rejeitado ${group.userRequestId} no grupo ${group.groupName}`
    );
  }

  // ==========================================================================
  // ENVIAR MENSAGEM NO GRUPO
  // ==========================================================================

  sendGroupMessage(
    topicGroup: string,
    groupId: string,
    content: string
  ): string {
    const messageId = `gmsg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: GroupMessageReceivedEvent = {
      type: "group_message_received",
      groupId,
      from: this.userId,
      topicGroup: topicGroup,
      content,
      messageId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(topicGroup, message, 1);

    console.log(
      `📨 [${this.userId}] Mensagem enviada no grupo ${groupId}`,
      `No topico: group/chat/${groupId}`
    );
    return messageId;
  }

  // ==========================================================================
  // SAIR DO GRUPO
  // ==========================================================================

  leaveGroup(groupId: string): void {
    this.mqttService.unsubscribe(`group/chat/${groupId}`);
    console.log(`👋 [${this.userId}] Saiu do grupo ${groupId}`);
  }

  cleanListGroups(listGroups: GroupDiscoveredEvent[]): void {
    for (const group of listGroups) {
      const message: GroupRemovedEvent = {
        type: "group_removed",
        groupId: group.groupId,
        groupName: group.groupName,
      };

      if (group.adminId === this.userId) {
        this.mqttService.publish(
          `${this.groupListTopic}/${group.groupId}`,
          message, // payload
          1, // QoS
          true // retain
        );
        this.mqttService.unsubscribe(`group/chat/${message.groupId}`);
      }

      console.log(`🧹 Grupo limpo: ${group.groupId} (${group.groupId})`);
    }
  }

  // ==========================================================================
  // API DE EVENTOS
  // ==========================================================================

  /**
   * Adiciona evento à fila
   */
  private pushEvent<T extends ChatServiceEvent | GroupServiceEvent>(
    event: T
  ): void {
    this.eventQueue.push(event);
  }

  /**
   * Retorna seu ID de usuário
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Retorna todos os eventos pendentes e limpa a fila
   */
  pollAllEvents<T extends GroupServiceEvent | ChatServiceEvent>(): T[] {
    const events = [...this.eventQueue] as T[];
    this.eventQueue = [];
    return events;
  }
}
