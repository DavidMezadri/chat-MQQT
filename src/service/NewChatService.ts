import { MqttService } from "./MqttService";

/**
 * Mensagem de convite enviada para iniciar conversa
 */
export interface InviteRequest {
  type: "invite";
  from: string; // ID de quem está convidando
  requestId: string; // ID único do convite
  timestamp: string; // Quando foi enviado
}

/**
 * Mensagem de aceite enviada quando convite é aceito
 */
export interface InviteAccept {
  type: "accept";
  from: string; // ID de quem aceitou
  to: string; // ID de quem enviou o convite
  chatTopic: string; // Tópico criado para conversa
  requestId: string; // ID do convite que está sendo aceito
  timestamp: string; // Quando foi aceito
}

/**
 * Mensagem de rejeição (opcional)
 */
export interface InviteReject {
  type: "reject";
  from: string; // ID de quem rejeitou
  to: string; // ID de quem enviou o convite
  requestId: string; // ID do convite que está sendo rejeitado
  timestamp: string;
}

/**
 * União de todos os tipos de mensagem de controle
 */
export type ControlMessage = InviteRequest | InviteAccept | InviteReject;

/**
 * Callback chamado quando um convite é recebido
 */
export type OnInviteReceivedCallback = (
  from: string,
  requestId: string
) => void;

/**
 * Callback chamado quando seu convite é aceito
 */
export type OnInviteAcceptedCallback = (
  acceptedBy: string,
  chatTopic: string,
  requestId: string
) => void;

/**
 * Callback chamado quando seu convite é rejeitado
 */
export type OnInviteRejectedCallback = (
  rejectedBy: string,
  requestId: string
) => void;

/**
 * Classe responsável por gerenciar convites de conversa
 */
export class NewChatService {
  private mqttService: MqttService; //servico websocket ja instaciado
  private userId: string;
  private controlTopic: string;

  // Armazena convites pendentes que VOCÊ recebeu
  // Map<requestId, fromUserId>
  private receivedInvites: Map<string, string> = new Map();

  // Armazena convites pendentes que VOCÊ enviou
  // Map<requestId, toUserId>
  private sentInvites: Map<string, string> = new Map();

  // Callbacks
  private onInviteReceivedCallbacks: OnInviteReceivedCallback[] = [];
  private onInviteAcceptedCallbacks: OnInviteAcceptedCallback[] = [];
  private onInviteRejectedCallbacks: OnInviteRejectedCallback[] = [];

  constructor(mqttService: MqttService, userId: string) {
    this.mqttService = mqttService;
    this.userId = userId;
    this.controlTopic = `control/${this.userId}`;

    this.setupControlChannel();
  }

  /**
   * Configura o canal de controle para receber convites e aceites
   */
  private setupControlChannel(): void {
    this.mqttService.subscribe(this.controlTopic, (topic, payload) => {
      try {
        const message: ControlMessage = JSON.parse(payload);
        this.handleControlMessage(message);
      } catch (error) {
        console.error("Erro ao processar mensagem de controle:", error);
      }
    });

    console.log(
      `🎧 [${this.userId}] Escutando convites em: ${this.controlTopic}`
    );
  }

  /**
   * Processa mensagens recebidas no canal de controle
   */
  private handleControlMessage(message: ControlMessage): void {
    switch (message.type) {
      case "invite":
        this.handleInviteReceived(message);
        break;
      case "accept":
        this.handleInviteAccepted(message);
        break;
      case "reject":
        this.handleInviteRejected(message);
        break;
    }
  }

  /**
   * Processa convite recebido
   */
  private handleInviteReceived(message: InviteRequest): void {
    console.log(`📨 [${this.userId}] Convite recebido de ${message.from}`);

    // Salva convite pendente
    this.receivedInvites.set(message.requestId, message.from);

    // Notifica callbacks
    this.onInviteReceivedCallbacks.forEach((callback) => {
      callback(message.from, message.requestId);
    });
  }

  /**
   * Processa aceite de convite (quando VOCÊ convidou alguém)
   */
  private handleInviteAccepted(message: InviteAccept): void {
    console.log(`✅ [${this.userId}] Convite aceito por ${message.from}`);
    console.log(`📍 [${this.userId}] Tópico de conversa: ${message.chatTopic}`);

    // Remove dos convites enviados
    this.sentInvites.delete(message.requestId);

    // Notifica callbacks
    this.onInviteAcceptedCallbacks.forEach((callback) => {
      callback(message.from, message.chatTopic, message.requestId);
    });
  }

  /**
   * Processa rejeição de convite
   */
  private handleInviteRejected(message: InviteReject): void {
    console.log(`❌ [${this.userId}] Convite rejeitado por ${message.from}`);

    // Remove dos convites enviados
    this.sentInvites.delete(message.requestId);

    // Notifica callbacks
    this.onInviteRejectedCallbacks.forEach((callback) => {
      callback(message.from, message.requestId);
    });
  }

  /**
   * Envia convite para outro usuário
   * @param targetUserId - ID do usuário que você quer convidar
   * @returns requestId - ID único do convite para rastreamento
   */
  sendInvite(targetUserId: string): string {
    // Gera ID único para o convite
    const requestId = `invite_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Cria mensagem de convite
    const inviteMessage: InviteRequest = {
      type: "invite",
      from: this.userId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Publica no tópico de controle do usuário alvo
    const targetControlTopic = `control/${targetUserId}`;
    this.mqttService.publish(targetControlTopic, inviteMessage);

    // Salva convite enviado
    this.sentInvites.set(requestId, targetUserId);

    console.log(`📤 [${this.userId}] Convite enviado para ${targetUserId}`);
    console.log(`🆔 Request ID: ${requestId}`);

    return requestId;
  }

  /**
   * Aceita um convite recebido
   * @param requestId - ID do convite que você quer aceitar
   * @returns chatTopic - Tópico criado para conversa, ou null se convite não existe
   */
  acceptInvite(requestId: string): string | null {
    // Verifica se o convite existe
    const fromUserId = this.receivedInvites.get(requestId);

    if (!fromUserId) {
      console.error(`❌ [${this.userId}] Convite ${requestId} não encontrado`);
      return null;
    }

    // Cria tópico único para conversa
    const chatTopic = this.createChatTopic(fromUserId, this.userId);

    // Cria mensagem de aceite
    const acceptMessage: InviteAccept = {
      type: "accept",
      from: this.userId,
      to: fromUserId,
      chatTopic,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia aceite para quem convidou
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, acceptMessage);

    // Remove convite pendente
    this.receivedInvites.delete(requestId);

    console.log(`✅ [${this.userId}] Convite aceito!`);
    console.log(`📍 [${this.userId}] Tópico criado: ${chatTopic}`);

    return chatTopic;
  }

  /**
   * Rejeita um convite recebido
   * @param requestId - ID do convite que você quer rejeitar
   */
  rejectInvite(requestId: string): boolean {
    // Verifica se o convite existe
    const fromUserId = this.receivedInvites.get(requestId);

    if (!fromUserId) {
      console.error(`❌ [${this.userId}] Convite ${requestId} não encontrado`);
      return false;
    }

    // Cria mensagem de rejeição
    const rejectMessage: InviteReject = {
      type: "reject",
      from: this.userId,
      to: fromUserId,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Envia rejeição para quem convidou
    const targetControlTopic = `control/${fromUserId}`;
    this.mqttService.publish(targetControlTopic, rejectMessage);

    // Remove convite pendente
    this.receivedInvites.delete(requestId);

    console.log(`❌ [${this.userId}] Convite rejeitado`);

    return true;
  }

  /**
   * Cria tópico único para conversa entre dois usuários
   * Ordena os IDs para garantir o mesmo tópico independente de quem convida
   */
  private createChatTopic(user1: string, user2: string): string {
    const sortedUsers = [user1, user2].sort();
    return `chat/${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  /**
   * Registra callback para quando você receber um convite
   */
  onInviteReceived(callback: OnInviteReceivedCallback): () => void {
    this.onInviteReceivedCallbacks.push(callback);

    // Retorna função para remover o callback
    return () => {
      const index = this.onInviteReceivedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onInviteReceivedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Registra callback para quando seu convite for aceito
   */
  onInviteAccepted(callback: OnInviteAcceptedCallback): () => void {
    this.onInviteAcceptedCallbacks.push(callback);

    return () => {
      const index = this.onInviteAcceptedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onInviteAcceptedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Registra callback para quando seu convite for rejeitado
   */
  onInviteRejected(callback: OnInviteRejectedCallback): () => void {
    this.onInviteRejectedCallbacks.push(callback);

    return () => {
      const index = this.onInviteRejectedCallbacks.indexOf(callback);
      if (index > -1) {
        this.onInviteRejectedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Retorna lista de convites pendentes que você recebeu
   */
  getReceivedInvites(): Array<{ requestId: string; from: string }> {
    return Array.from(this.receivedInvites.entries()).map(
      ([requestId, from]) => ({ requestId, from })
    );
  }

  /**
   * Retorna lista de convites pendentes que você enviou
   */
  getSentInvites(): Array<{ requestId: string; to: string }> {
    return Array.from(this.sentInvites.entries()).map(([requestId, to]) => ({
      requestId,
      to,
    }));
  }

  /**
   * Retorna seu ID de usuário
   */
  getUserId(): string {
    return this.userId;
  }
}
