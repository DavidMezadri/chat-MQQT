import * as Paho from "paho-mqtt";

export interface MqttConfig {
  brokerHost: string;
  brokerPort: number;
  brokerPath?: string;
  clientId?: string;
  username?: string;
  password?: string;
  useSSL?: boolean;
  cleanSession?: boolean;
  keepAliveInterval?: number;
  timeout?: number;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export interface MqttMessage {
  topic: string;
  payload: string;
  qos: Paho.Qos;
  retained?: boolean;
}

export type MessageHandler = (topic: string, payload: string) => void;
export type ConnectionStatusHandler = (connected: boolean) => void;
export type ErrorHandler = (error: string) => void;

export class MqttService {
  private client: Paho.Client;
  private config: MqttConfig;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionStatusHandlers: ConnectionStatusHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isConnected: boolean = false;
  private shouldReconnect: boolean = false;

  constructor(config: MqttConfig) {
    this.config = {
      brokerPath: "/",
      cleanSession: true,
      keepAliveInterval: 60,
      timeout: 10,
      reconnect: true,
      reconnectInterval: 5000,
      ...config,
    };

    const clientId =
      this.config.clientId ??
      `mqtt_client_${Math.random().toString(36).substring(7)}`;

    this.client = new Paho.Client(
      this.config.brokerHost,
      this.config.brokerPort,
      this.config.brokerPath!,
      clientId
    );

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.client.onConnectionLost = (responseObject: Paho.MQTTError) => {
      this.isConnected = false;
      this.notifyConnectionStatus(false);
      this.notifyError(`Conexão perdida: ${responseObject.errorMessage}`);

      if (this.shouldReconnect && this.config.reconnect) {
        setTimeout(() => {
          this.reconnect();
        }, this.config.reconnectInterval);
      }
    };

    this.client.onMessageArrived = (message: Paho.Message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;

      // Notifica handlers específicos do tópico
      const handlers = this.messageHandlers.get(topic) || [];
      handlers.forEach((handler) => handler(topic, payload));

      // Notifica handlers wildcard
      const wildcardHandlers = this.messageHandlers.get("*") || [];
      wildcardHandlers.forEach((handler) => handler(topic, payload));
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectOptions: Paho.ConnectionOptions = {
        onSuccess: () => {
          this.isConnected = true;
          this.shouldReconnect = true;
          this.notifyConnectionStatus(true);
          console.log("Conectado ao broker MQTT");
          resolve();
        },
        onFailure: (err: Paho.ErrorWithInvocationContext) => {
          this.isConnected = false;
          this.notifyError(`Falha na conexão: ${err.errorMessage}`);
          reject(new Error(err.errorMessage));
        },
        timeout: this.config.timeout,
        keepAliveInterval: this.config.keepAliveInterval,
        cleanSession: this.config.cleanSession,
        useSSL: this.config.useSSL,
      };

      if (this.config.username) {
        connectOptions.userName = this.config.username;
      }

      if (this.config.password) {
        connectOptions.password = this.config.password;
      }

      this.client.connect(connectOptions);
    });
  }

  private reconnect(): void {
    if (!this.isConnected && this.shouldReconnect) {
      console.log("Tentando reconectar...");
      this.connect().catch((error) => {
        console.error("Falha na reconexão:", error);
      });
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.isConnected) {
      this.client.disconnect();
      this.isConnected = false;
      this.notifyConnectionStatus(false);
    }
  }

  subscribe(topic: string, handler?: MessageHandler, qos: Paho.Qos = 0): void {
    if (!this.isConnected) {
      this.notifyError("Não conectado ao broker");
      return;
    }

    this.client.subscribe(topic, {
      qos,
      onSuccess: () => {
        console.log(`Inscrito no tópico: ${topic}`);
        if (handler) {
          this.addMessageHandler(topic, handler);
        }
      },
      onFailure: (err: Paho.ErrorWithInvocationContext) => {
        this.notifyError(`Falha ao inscrever em ${topic}: ${err.errorMessage}`);
      },
    });
  }

  unsubscribe(topic: string): void {
    if (!this.isConnected) {
      this.notifyError("Não conectado ao broker");
      return;
    }

    this.client.unsubscribe(topic, {
      onSuccess: () => {
        console.log(`Desinscrito do tópico: ${topic}`);
        this.removeMessageHandlers(topic);
      },
      onFailure: (err: Paho.ErrorWithInvocationContext) => {
        this.notifyError(
          `Falha ao desinscrever de ${topic}: ${err.errorMessage}`
        );
      },
    });
  }

  publish(
    topic: string,
    payload: string | object,
    qos: Paho.Qos = 0,
    retained: boolean = false
  ): void {
    if (!this.isConnected) {
      this.notifyError("Não conectado ao broker");
      return;
    }

    const payloadString =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const message = new Paho.Message(payloadString);
    message.destinationName = topic;
    message.qos = qos;
    message.retained = retained;

    this.client.send(message);
  }

  addMessageHandler(topic: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, []);
    }
    this.messageHandlers.get(topic)!.push(handler);
  }

  removeMessageHandlers(topic: string): void {
    this.messageHandlers.delete(topic);
  }

  onConnectionStatusChange(handler: ConnectionStatusHandler): () => void {
    this.connectionStatusHandlers.push(handler);
    // Retorna função para remover o handler
    return () => {
      const index = this.connectionStatusHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionStatusHandlers.splice(index, 1);
      }
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    // Retorna função para remover o handler
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionStatusHandlers.forEach((handler) => handler(connected));
  }

  private notifyError(error: string): void {
    this.errorHandlers.forEach((handler) => handler(error));
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  getClientId(): string {
    return this.client.clientId;
  }
}
