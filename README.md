# Chat MQTT Toticos

Um aplicativo de chat em tempo real construído com React, Vite e protocolo MQTT para comunicação de mensagens.

## 🚀 Tecnologias

- **React** - Biblioteca para construção de interfaces
- **Vite** - Build tool e dev server ultrarrápido
- **TypeScript** - Tipagem estática para JavaScript
- **MQTT** - Protocolo de mensageria leve para comunicação em tempo real
- **Biblioteca Paho** - Implementa funcionalidades do MQTT
- **ESLint** - Linting e formatação de código

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Broker MQTT (ex: Mosquitto, HiveMQ, ou broker público)

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/DavidMezadri/chat-MQQT-Toticos.git
cd chat-MQQT-Toticos
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis do broker na função:

```
setMyNumberTelephone
      brokerHost: "localhost"
      brokerPort: 9001
      useSSL: false
```

## 🎮 Como usar

### Modo de desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

## 📱 Funcionalidades

- ✅ Chat em tempo real usando protocolo MQTT
- ✅ Interface responsiva e moderna
- ✅ Conexão com brokers MQTT públicos ou privados
- ✅ Suporte a múltiplos usuários simultâneos
- ✅ Mensagens em tempo real com baixa latência

## 🏗️ Estrutura do Projeto

```
chat-MQQT-Toticos/
├── src/
│   ├── components/      # Componentes React
│   ├── hooks/           # Custom hooks
│   ├── services/        # Serviços (MQTT client, etc)
│   ├── styles/          # Arquivos de estilo
│   ├── App.tsx          # Componente principal
│   └── main.tsx         # Entry point
├── public/              # Arquivos estáticos
├── package.json
├── vite.config.ts       # Configuração do Vite
├── tsconfig.json        # Configuração do TypeScript
└── eslint.config.js     # Configuração do ESLint
```

## 🔌 Configuração do MQTT

Este projeto utiliza o protocolo MQTT para comunicação em tempo real. Você pode usar:

- **Mosquitto local**: Instale o Mosquitto e rode localmente
- **Broker próprio**: Configure seu próprio broker MQTT

### Exemplo de configuração do cliente MQTT

4. Ajustar Servidor Local Mosquitto
   Verificar se temos servidor rodando

```
sudo systemctl status mosquitto
```

Criar arquivo de configuração do servidor (se não existir) e setar configurações

```
sudo nano /etc/mosquitto/mosquitto.conf


# Place your local configuration in /etc/mosquitto/conf.d/

# A full description of the configuration file is at
# /usr/share/doc/mosquitto/examples/mosquitto.conf.example

#pid_file /run/mosquitto/mosquitto.pid

persistence true
persistence_location /var/lib/mosquitto/

include_dir /etc/mosquitto/conf.d

# Listener MQTT padrão (TCP)
listener 1883
protocol mqtt
allow_anonymous true

# Listener para WebSocket (para usar no navegador com Paho JS)
listener 9001
protocol websockets
allow_anonymous true

#Ativar Logs Essenciais
log_dest file /var/log/mosquitto/mosquitto.log
log_type all


sudo systemctl restart mosquitto

```

## 🤝 Contribuindo

## 📝 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 👤 Autor

**David Fambre Mezadri**
**Paulo Henrique Hollenbach Muller**

- GitHub: [@DavidMezadri](https://github.com/DavidMezadri)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!
