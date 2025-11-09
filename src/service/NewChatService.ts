import type { MqttService } from "./MqttService";

// ============================================================================
// MENSAGENS DE CONTROLE (Convites)
// ============================================================================

export interface InviteRequest {
	type: "invite";
	from: string;
	requestId: string;
	timestamp: string;
}

export interface InviteAccept {
	type: "accept";
	from: string;
	to: string;
	chatTopic: string;
	requestId: string;
	timestamp: string;
}

export interface InviteReject {
	type: "reject";
	from: string;
	to: string;
	requestId: string;
	timestamp: string;
}

export type ControlMessage = InviteRequest | InviteAccept | InviteReject;

// ============================================================================
// MENSAGENS DE CHAT
// ============================================================================

export interface ChatMessage {
	type: "message";
	from: string;
	content: string;
	messageId: string;
	timestamp: string;
}

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
	| ChatSubscribedEvent
	| ErrorEvent
	| InviteAccept;

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

export class NewChatService {
	private mqttService: MqttService;
	private userId: string;
	private controlTopic: string;

	// Fila de eventos
	private eventQueue: ChatServiceEvent[] = [];

	// Chats ativos (tópicos em que estou inscrito)
	private activeChats: Set<string> = new Set();

	constructor(mqttService: MqttService) {
		this.mqttService = mqttService;
		this.userId = mqttService.getClientId();
		this.controlTopic = `control/${this.userId}`;

		this.setupControlChannel();
	}

	// ==========================================================================
	// SETUP INICIAL
	// ==========================================================================

	private setupControlChannel(): void {
		this.mqttService.subscribe(this.controlTopic, (_topic, payload) => {
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
		});

		console.log(`🎧 [${this.userId}] Canal de controle: ${this.controlTopic}`);
	}

	// ==========================================================================
	// PROCESSAMENTO DE MENSAGENS DE CONTROLE
	// ==========================================================================

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
			type: "invite",
			from: userId,
			requestId,
			timestamp: new Date().toISOString(),
		};

		// Envia para tópico padrão do destinatário
		const targetControlTopic = `control/${targetUserId}`;
		this.mqttService.publish(targetControlTopic, inviteMessage);

		console.log(`📤 [${this.userId}] Convite enviado para ${targetUserId}`);
		console.log(`🆔 Request ID: ${requestId}`);

		return requestId;
	}

	// ==========================================================================
	// RESPOSTA A CONVITES
	// ==========================================================================

	/**
	 * Aceita um convite recebido
	 * Cria um novo tópico de chat e envia a resposta para o remetente original
	 * Retorna o tópico criado
	 */
	acceptInvite(requestId: string, fromUserId: string): string {
		// Cria tópico único para o chat
		const chatTopic = this.createChatTopic(fromUserId, this.userId);

		const acceptMessage: InviteAccept = {
			type: "accept",
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
			type: "reject",
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
		if (this.activeChats.has(chatTopic)) {
			console.log(`⚠️ [${this.userId}] Já inscrito em ${chatTopic}`);
			return;
		}

		this.mqttService.subscribe(chatTopic, (_topic, payload) => {
			try {
				const message: ChatMessage = JSON.parse(payload);
				this.handleChatMessage(message, chatTopic);
			} catch (error) {
				this.pushEvent({
					type: "error",
					error: "Erro ao processar mensagem de chat",
					context: { chatTopic, payload, error },
					timestamp: new Date().toISOString(),
				});
			}
		});

		this.activeChats.add(chatTopic);

		this.pushEvent({
			type: "chat_subscribed",
			chatTopic,
			timestamp: new Date().toISOString(),
		});

		console.log(`🔔 [${this.userId}] Inscrito no chat: ${chatTopic}`);
	}

	/**
	 * Processa mensagem recebida em um chat
	 */
	private handleChatMessage(message: ChatMessage, chatTopic: string): void {
		// Ignora mensagens enviadas por mim mesmo
		if (message.from === this.userId) {
			return;
		}

		console.log(
			`💬 [${this.userId}] Mensagem de ${message.from}: ${message.content}`,
		);

		this.pushEvent({
			type: "message_received",
			from: message.from,
			content: message.content,
			messageId: message.messageId,
			chatTopic,
			timestamp: message.timestamp,
		});
	}

	// ==========================================================================
	// ENVIO DE MENSAGENS
	// ==========================================================================

	/**
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
			timestamp: new Date().toISOString(),
		};

		this.mqttService.publish(chatTopic, message);

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

	/**
	 * Adiciona evento à fila
	 */
	private pushEvent(event: ChatServiceEvent): void {
		this.eventQueue.push(event);
	}

	// ==========================================================================
	// API DE EVENTOS
	// ==========================================================================

	/**
	 * Retorna e remove o próximo evento da fila
	 */
	pollEvent(): ChatServiceEvent | null {
		return this.eventQueue.shift() || null;
	}

	/**
	 * Retorna todos os eventos pendentes e limpa a fila
	 */
	pollAllEvents(): ChatServiceEvent[] {
		const events = [...this.eventQueue];
		this.eventQueue = [];
		return events;
	}

	/**
	 * Retorna o próximo evento sem removê-lo da fila
	 */
	peekEvent(): ChatServiceEvent | null {
		return this.eventQueue[0] || null;
	}

	/**
	 * Verifica se há eventos pendentes
	 */
	hasEvents(): boolean {
		return this.eventQueue.length > 0;
	}

	/**
	 * Retorna o número de eventos pendentes
	 */
	getEventCount(): number {
		return this.eventQueue.length;
	}

	/**
	 * Retorna lista de chats ativos
	 */
	getActiveChats(): string[] {
		return Array.from(this.activeChats);
	}

	/**
	 * Retorna seu ID de usuário
	 */
	getUserId(): string {
		return this.userId;
	}
}
