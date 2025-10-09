// Use global Paho.MQTT.Client from window, not ES import

interface Message {
  author: string;
  text: string;
  timestamp: string;
}

type Callback = (msg: Message) => void;

export class ChatService {
  private client: any;
  private callback: Callback | null = null;
  private topic: string;
  private clientId: string;

  constructor() {
    this.topic = "teste";
    this.clientId = "user_" + Math.floor(Math.random() * 1000);

    this.client = new (window as any).Paho.Client(
      "localhost",
      9001,
      "/",
      this.clientId
    );

    this.client.onConnectionLost = (responseObject: any) => {
      console.log("Conexão perdida:", responseObject.errorMessage);
    };

    this.client.onMessageArrived = (message: any) => {
      if (this.callback) {
        // Parse author and text from the received message string
        const [author, ...rest] = message.payloadString.split(": ");
        const text = rest.join(": ");
        this.callback({
          author: author === this.clientId ? "Voce:" : author,
          text,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    };
  }

  connect(cb: Callback) {
    this.callback = cb;
    this.client.connect({
      onSuccess: () => {
        console.log("Conectado ao MQTT!");
        this.client.subscribe(this.topic);
        if (this.callback) {
          this.callback({
            author: "Sistema",
            text: "Conectado ao MQTT!",
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      },
      onFailure: (err: any) => {
        console.error("Falha ao conectar:", err.errorMessage);
      },
    });
  }

  send(text: string) {
    const payload = `${this.clientId}: ${text}`;
    // @ts-ignore
    const message = new (window as any).Paho.Message(payload);
    message.destinationName = this.topic;
    this.client.send(message);
  }
}
