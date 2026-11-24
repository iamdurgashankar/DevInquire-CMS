export interface ConsoleEventPayload {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  source: 'BACKEND' | 'FRONTEND' | 'SDK' | 'API' | 'SECURITY' | 'SYSTEM';
  category?: string;
  message: string;
  stackTrace?: string;
  path?: string;
  method?: string;
  httpStatus?: number;
  durationMs?: number;
  actor?: string;
  nodePath?: string;
  metadata?: Record<string, any>;
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
}

const JAVA_API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/+$/, '');
const FALLBACK_STORAGE_KEY = 'devinquire_console_fallback_events';
let initialized = false;

const saveFallbackEvent = (payload: ConsoleEventPayload) => {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...payload,
      status: payload.status || (payload.level === 'ERROR' || payload.level === 'WARN' ? 'OPEN' : 'RESOLVED'),
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // ignore storage quota errors
  }
};

export const getFallbackConsoleEvents = (): any[] => {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export async function reportConsoleEvent(payload: ConsoleEventPayload): Promise<void> {
  const enriched: ConsoleEventPayload = {
    ...payload,
    path: payload.path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
  };

  try {
    const res = await fetch(`${JAVA_API_BASE}/api/v1/console/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    });
    if (!res.ok) {
      saveFallbackEvent(enriched);
    }
  } catch {
    saveFallbackEvent(enriched);
  }
}

export function initGlobalConsoleCapture(getActor?: () => string): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    reportConsoleEvent({
      level: 'ERROR',
      source: 'FRONTEND',
      category: 'UNCAUGHT_ERROR',
      message: event.message || 'Uncaught window error',
      stackTrace: event.error?.stack || `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`,
      actor: getActor ? getActor() : 'browser-client',
      nodePath: '/client/runtime',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
        ? reason
        : 'Unhandled Promise rejection';
    reportConsoleEvent({
      level: 'ERROR',
      source: 'FRONTEND',
      category: 'UNHANDLED_PROMISE',
      message,
      stackTrace: reason instanceof Error ? reason.stack : JSON.stringify(reason),
      actor: getActor ? getActor() : 'browser-client',
      nodePath: '/client/promises',
    });
  });
}
