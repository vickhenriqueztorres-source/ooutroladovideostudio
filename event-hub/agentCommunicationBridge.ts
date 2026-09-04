import crypto from 'crypto';
import { EventBus } from './eventBus';
import { Logger } from './logger';

export type AgentMessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface AgentMessageEnvelope<T = any> {
  messageId: string;
  correlationId: string;
  sender: string;
  recipient: string;
  topic: string;
  priority: AgentMessagePriority;
  timestamp: string;
  payload: T;
}

export class AgentCommunicationBridge {
  private static instance: AgentCommunicationBridge;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): AgentCommunicationBridge {
    if (!AgentCommunicationBridge.instance) {
      AgentCommunicationBridge.instance = new AgentCommunicationBridge();
    }
    return AgentCommunicationBridge.instance;
  }

  /**
   * Publica uma mensagem tipada no barramento para consumo por outros agentes e dashboards.
   */
  public publish<T>(
    messageInput: Partial<AgentMessageEnvelope<T>> & {
      sender: string;
      topic: string;
      payload: T;
    }
  ): AgentMessageEnvelope<T> {
    const fullEnvelope: AgentMessageEnvelope<T> = {
      messageId: messageInput.messageId || `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      correlationId: messageInput.correlationId || `corr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sender: messageInput.sender,
      recipient: messageInput.recipient || '*',
      topic: messageInput.topic,
      priority: messageInput.priority || 'NORMAL',
      timestamp: messageInput.timestamp || new Date().toISOString(),
      payload: messageInput.payload
    };

    // 1. Notifica via canal interno da ponte
    this.eventBus.emit(`topic:${fullEnvelope.topic}`, fullEnvelope);
    this.eventBus.emit('agent_message', fullEnvelope);

    // 2. Persiste e transmite via EventBus global (SQLite e WebSocket)
    try {
      this.eventBus.emitEvent({
        event_id: fullEnvelope.messageId,
        production_id: fullEnvelope.correlationId,
        source: 'MISSION_CONTROL',
        agent_name: fullEnvelope.sender,
        event_type: 'STEP_COMPLETED',
        timestamp: fullEnvelope.timestamp,
        payload: {
          topic: fullEnvelope.topic,
          recipient: fullEnvelope.recipient,
          priority: fullEnvelope.priority,
          data: fullEnvelope.payload
        }
      });
    } catch (err: any) {
      Logger.warn('AgentBridge', `Aviso ao emitir evento de mensagem: ${err.message}`);
    }

    Logger.info(
      'AgentBridge',
      `✉️ [${fullEnvelope.sender} ➔ ${fullEnvelope.recipient}] Tópico: "${fullEnvelope.topic}" (${fullEnvelope.messageId})`
    );

    return fullEnvelope;
  }

  /**
   * Inscreve um manipulador para receber mensagens de um determinado tópico.
   * Retorna uma função para cancelar a inscrição.
   */
  public subscribe<T>(
    topic: string,
    handler: (message: AgentMessageEnvelope<T>) => void | Promise<void>
  ): () => void {
    const eventName = `topic:${topic}`;
    const listener = (msg: AgentMessageEnvelope<T>) => {
      try {
        const res = handler(msg);
        if (res instanceof Promise) {
          res.catch((err) => {
            Logger.error('AgentBridge', `Erro assíncrono no handler do tópico '${topic}': ${err.message}`);
          });
        }
      } catch (err: any) {
        Logger.error('AgentBridge', `Erro no handler do tópico '${topic}': ${err.message}`);
      }
    };

    this.eventBus.on(eventName, listener);
    return () => {
      this.eventBus.off(eventName, listener);
    };
  }

  /**
   * Padrão Request-Response entre agentes assíncronos:
   * Publica uma requisição e aguarda a resposta correspondente pelo correlationId.
   */
  public async requestReply<TReq, TRes>(
    requestInput: Partial<AgentMessageEnvelope<TReq>> & {
      sender: string;
      topic: string;
      payload: TReq;
    },
    replyTopic: string,
    timeoutMs: number = 30000
  ): Promise<AgentMessageEnvelope<TRes>> {
    const correlationId = requestInput.correlationId || `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const unsubscribe = this.subscribe<TRes>(replyTopic, (msg) => {
        if (msg.correlationId === correlationId) {
          if (timer) clearTimeout(timer);
          unsubscribe();
          resolve(msg);
        }
      });

      timer = setTimeout(() => {
        unsubscribe();
        reject(
          new Error(
            `TIMEOUT_WAITING_AGENT_REPLY: Tópico de resposta '${replyTopic}' não respondeu em ${timeoutMs}ms (corr: ${correlationId}).`
          )
        );
      }, timeoutMs);

      this.publish<TReq>({
        ...requestInput,
        correlationId
      });
    });
  }
}
