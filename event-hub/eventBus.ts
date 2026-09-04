import { EventEmitter } from 'events';
import { getDatabase } from '../database/db';
import { Logger } from './logger';

export interface AgentEvent {
  event_id?: string;
  production_id: string;
  source: 'HIDDEN_SYSTEMS_LAB' | 'FIREFLY_BOT' | 'MISSION_CONTROL' | 'CODEX_REVIEWER';
  agent_name: string;
  step_index?: number;
  event_type: 'STEP_STARTED' | 'STEP_COMPLETED' | 'QA_APPROVED' | 'QA_REJECTED' | 'HANDOFF_REACHED' | 'JOB_SUBMITTED' | 'JOB_COMPLETED' | 'ERROR';
  timestamp?: string;
  payload?: any;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public emitEvent(event: AgentEvent): void {
    const timestamp = event.timestamp || new Date().toISOString();
    const eventId = event.event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT OR IGNORE INTO productions (production_id, project_name, status)
        VALUES (?, 'O Outro Lado', 'RUNNING')
      `).run(event.production_id);

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO agent_events (event_id, production_id, source, agent_name, step_index, event_type, timestamp, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        eventId,
        event.production_id,
        event.source,
        event.agent_name,
        event.step_index || 0,
        event.event_type,
        timestamp,
        JSON.stringify(event.payload || {})
      );
    } catch (err: any) {
      Logger.error('EventBus', `Erro ao persistir evento no SQLite: ${err.message}`);
    }

    const enrichedEvent: AgentEvent = {
      ...event,
      event_id: eventId,
      timestamp
    };

    this.emit('agent_event', enrichedEvent);
    Logger.info('EventBus', `[${event.source}] ${event.agent_name}: ${event.event_type} (${event.production_id})`);
  }
}
