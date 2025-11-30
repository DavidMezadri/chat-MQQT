import type { MqttService } from "./MqttService";

// ============================================================================
// TIPOS DE MENSAGENS DE GRUPO
// ============================================================================

export interface GroupJoinRequest {
  type: "group_join_request";
  groupId: string;
  userId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinApproval {
  type: "group_join_approval";
  groupId: string;
  groupTopic: string;
  userId: string;
  requestId: string;
  approvedBy: string;
  timestamp: string;
}

export interface GroupJoinRejection {
  type: "group_join_rejection";
  groupId: string;
  userId: string;
  requestId: string;
  rejectedBy: string;
  timestamp: string;
}

export interface GroupMessage {
  type: "group_message";
  groupId: string;
  from: string;
  content: string;
  messageId: string;
  timestamp: string;
}

export interface GroupAdvertisement {
  type: "group_advertisement";
  groupId: string;
  groupName: string;
  adminId: string;
  listMenber: string[];
  memberCount: number;
  createdAt: string;
}

export interface GroupInfo {
  groupId: string;
  groupName: string;
  adminId: string;
  listMenber: string[];
  memberCount: number;
  createdAt: string;
}

// ============================================================================
// EVENTOS
// ============================================================================

export interface GroupCreatedEvent {
  type: "group_created";
  groupId: string;
  groupName: string;
  groupTopic: string;
  timestamp: string;
}

export interface GroupJoinRequestEvent {
  type: "group_join_request_received";
  groupId: string;
  userId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinApprovedEvent {
  type: "group_join_approved";
  groupId: string;
  groupTopic: string;
  requestId: string;
  timestamp: string;
}

export interface GroupJoinRejectedEvent {
  type: "group_join_rejected";
  groupId: string;
  requestId: string;
  timestamp: string;
}

export interface GroupMessageReceivedEvent {
  type: "group_message_received";
  groupId: string;
  from: string;
  content: string;
  messageId: string;
  timestamp: string;
}

export interface GroupDiscoveredEvent {
  type: "group_discovered";
  groupInfo: GroupInfo;
  timestamp: string;
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
  | GroupErrorEvent;

// ============================================================================
// SERVIÇO DE GRUPOS
// ============================================================================

export class GroupService {
  private mqttService: MqttService;
  private userId: string;
  private groupControlTopic: string;
  private eventQueue: GroupServiceEvent[] = [];
  private isListingGroups: boolean = false;
  private adminGroups: Map<string, GroupInfo> = new Map();

  constructor(mqttService: MqttService) {
    this.mqttService = mqttService;
    this.userId = mqttService.getClientId();
    this.groupControlTopic = `group/control/${this.userId}`;

    // Configura handler global DIRETO
    this.setupGlobalHandler();

    console.log(`🏢 [${this.userId}] GroupService criado`);
  }

  // ==========================================================================
  // HANDLER GLOBAL - TUDO EM UM LUGAR
  // ==========================================================================

  private setupGlobalHandler(): void {
    this.mqttService.setGlobalMessageHandler((topic, payload) => {
      try {
        // Mensagens de CONTROLE (pedidos de entrada, aprovações, rejeições)
        if (topic.startsWith("group/control/")) {
          const message = JSON.parse(payload);

          if (message.type === "group_join_request") {
            this.eventQueue.push({
              type: "group_join_request_received",
              groupId: message.groupId,
              userId: message.userId,
              requestId: message.requestId,
              timestamp: message.timestamp,
            });
          } else if (message.type === "group_join_approval") {
            // Inscreve automaticamente no grupo
            this.mqttService.subscribe(
              `group/chat/${message.groupId}`,
              undefined,
              1
            );

            this.eventQueue.push({
              type: "group_join_approved",
              groupId: message.groupId,
              groupTopic: message.groupTopic,
              requestId: message.requestId,
              timestamp: message.timestamp,
            });
          } else if (message.type === "group_join_rejection") {
            this.eventQueue.push({
              type: "group_join_rejected",
              groupId: message.groupId,
              requestId: message.requestId,
              timestamp: message.timestamp,
            });
          }
        }

        // Mensagens de CHAT do grupo
        else if (topic.startsWith("group/chat/")) {
          const message: GroupMessage = JSON.parse(payload);

          // Ignora próprias mensagens
          if (message.from === this.userId) return;

          this.eventQueue.push({
            type: "group_message_received",
            groupId: message.groupId,
            from: message.from,
            content: message.content,
            messageId: message.messageId,
            timestamp: message.timestamp,
          });
        }

        // ANÚNCIOS de grupos (só processa se estiver listando)
        else if (topic.startsWith("group/list/") && this.isListingGroups) {
          const ad: GroupAdvertisement = JSON.parse(payload);

          this.eventQueue.push({
            type: "group_discovered",
            groupInfo: {
              groupId: ad.groupId,
              groupName: ad.groupName,
              adminId: ad.adminId,
              listMenber: ad.listMenber,
              memberCount: ad.memberCount,
              createdAt: ad.createdAt,
            },
            timestamp: new Date().toISOString(),
          });
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
  // INICIALIZAR
  // ==========================================================================

  async initialize(): Promise<void> {
    this.mqttService.subscribe(this.groupControlTopic, undefined, 1);
    console.log(`🎧 [${this.userId}] Inscrito em: ${this.groupControlTopic}`);
  }

  // ==========================================================================
  // CRIAR GRUPO
  // ==========================================================================

  createGroup(groupName: string): string {
    const groupId = `group_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const groupTopic = `group/chat/${groupId}`;
    const createdAt = new Date().toISOString();

    const groupInfo: GroupInfo = {
      groupId,
      groupName,
      adminId: this.userId,
      listMenber: [],
      memberCount: 1,
      createdAt,
    };

    this.adminGroups.set(groupId, groupInfo);

    // Publica anúncio com RETAIN
    const ad: GroupAdvertisement = {
      type: "group_advertisement",
      groupId,
      groupName,
      adminId: this.userId,
      listMenber: [],
      memberCount: 1,
      createdAt,
    };

    this.mqttService.publish(`group/list/${groupId}`, ad, 1, true);

    // Inscreve no grupo
    this.mqttService.subscribe(groupTopic, undefined, 1);

    this.eventQueue.push({
      type: "group_created",
      groupId,
      groupName,
      groupTopic,
      timestamp: new Date().toISOString(),
    });

    console.log(`🏢 [${this.userId}] Grupo criado: ${groupName}`);
    return groupId;
  }

  // ==========================================================================
  // LISTAR GRUPOS
  // ==========================================================================

  startListingGroups(): void {
    this.isListingGroups = true;
    this.mqttService.subscribe("group/list/#", undefined, 1);
    console.log(`📋 [${this.userId}] Listando grupos...`);
  }

  stopListingGroups(): void {
    this.isListingGroups = false;
    this.mqttService.unsubscribe("group/list/#");
    console.log(`🛑 [${this.userId}] Parou de listar grupos`);
  }

  // ==========================================================================
  // PEDIR ENTRADA NO GRUPO
  // ==========================================================================

  requestJoinGroup(groupId: string, adminId: string): string {
    const requestId = `join_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const request: GroupJoinRequest = {
      type: "group_join_request",
      groupId,
      userId: this.userId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(`group/control/${adminId}`, request, 1);

    console.log(`📤 [${this.userId}] Pedido enviado para grupo ${groupId}`);
    return requestId;
  }

  // ==========================================================================
  // APROVAR ENTRADA (ADMIN)
  // ==========================================================================

  approveJoinRequest(groupId: string, userId: string, requestId: string): void {
    if (!this.adminGroups.has(groupId)) {
      console.error(`❌ Não é admin do grupo ${groupId}`);
      return;
    }

    const approval: GroupJoinApproval = {
      type: "group_join_approval",
      groupId,
      groupTopic: `group/chat/${groupId}`,
      userId,
      requestId,
      approvedBy: this.userId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(`group/control/${userId}`, approval, 1);

    // Atualiza contador
    const group = this.adminGroups.get(groupId)!;
    group.memberCount++;

    console.log(`✅ [${this.userId}] Aprovado ${userId} no grupo ${groupId}`);
  }

  // ==========================================================================
  // REJEITAR ENTRADA (ADMIN)
  // ==========================================================================

  rejectJoinRequest(groupId: string, userId: string, requestId: string): void {
    if (!this.adminGroups.has(groupId)) {
      console.error(`❌ Não é admin do grupo ${groupId}`);
      return;
    }

    const rejection: GroupJoinRejection = {
      type: "group_join_rejection",
      groupId,
      userId,
      requestId,
      rejectedBy: this.userId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(`group/control/${userId}`, rejection, 1);

    console.log(`❌ [${this.userId}] Rejeitado ${userId} no grupo ${groupId}`);
  }

  // ==========================================================================
  // ENVIAR MENSAGEM NO GRUPO
  // ==========================================================================

  sendGroupMessage(groupId: string, content: string): string {
    const messageId = `gmsg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const message: GroupMessage = {
      type: "group_message",
      groupId,
      from: this.userId,
      content,
      messageId,
      timestamp: new Date().toISOString(),
    };

    this.mqttService.publish(`group/chat/${groupId}`, message, 1);

    console.log(`📨 [${this.userId}] Mensagem enviada no grupo ${groupId}`);
    return messageId;
  }

  // ==========================================================================
  // SAIR DO GRUPO
  // ==========================================================================

  leaveGroup(groupId: string): void {
    this.mqttService.unsubscribe(`group/chat/${groupId}`);
    console.log(`👋 [${this.userId}] Saiu do grupo ${groupId}`);
  }

  // ==========================================================================
  // API DE EVENTOS
  // ==========================================================================

  pollEvent(): GroupServiceEvent | null {
    return this.eventQueue.shift() || null;
  }

  pollAllEvents(): GroupServiceEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  hasEvents(): boolean {
    return this.eventQueue.length > 0;
  }

  getEventCount(): number {
    return this.eventQueue.length;
  }

  getUserId(): string {
    return this.userId;
  }

  getAdminGroups(): GroupInfo[] {
    return Array.from(this.adminGroups.values());
  }
}
