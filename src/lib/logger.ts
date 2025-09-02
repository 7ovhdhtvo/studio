
export type LogEntry = {
  id: number;
  timestamp: string;
  level: 'log' | 'error';
  message: string;
  data?: any;
};

type Subscriber = (log: LogEntry) => void;

class Logger {
  private subscribers: Set<Subscriber> = new Set();
  private logIdCounter = 0;

  public subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
  }

  public unsubscribe(callback: Subscriber) {
    this.subscribers.delete(callback);
  }

  private emit(log: LogEntry) {
    this.subscribers.forEach(callback => {
      try {
        callback(log);
      } catch (e) {
        console.error('Error in logger subscriber:', e);
      }
    });
  }
  
  private formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  }

  public log(message: string, data?: any) {
    const entry: LogEntry = {
      id: this.logIdCounter++,
      timestamp: this.formatTime(new Date()),
      level: 'log',
      message,
      data,
    };
    console.log(`[LOG] ${message}`, data || '');
    this.emit(entry);
  }

  public error(message: string, data?: any) {
    const entry: LogEntry = {
      id: this.logIdCounter++,
      timestamp: this.formatTime(new Date()),
      level: 'error',
      message,
      data,
    };
    console.error(`[ERROR] ${message}`, data || '');
    this.emit(entry);
  }
}

// Singleton export
export const logger = new Logger();
