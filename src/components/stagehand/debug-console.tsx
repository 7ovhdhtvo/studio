
"use client";

import { useEffect, useState } from 'react';
import { logger, type LogEntry } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';

export default function DebugConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handleNewLog = (log: LogEntry) => {
      setLogs(prevLogs => [...prevLogs, log].slice(-100)); // Keep last 100 logs
    };

    logger.subscribe(handleNewLog);
    return () => {
      logger.unsubscribe(handleNewLog);
    };
  }, []);

  const getBadgeVariant = (level: 'log' | 'error') => {
    switch (level) {
      case 'log':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Card className="mb-6 border-yellow-500/50">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base font-semibold text-yellow-600">
          Debug Console
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => setLogs([])}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-48 w-full">
          <div className="p-4 space-y-2 text-xs">
            {logs.length === 0 && <p className="text-muted-foreground">No events yet...</p>}
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 font-mono">
                <span className="text-muted-foreground">{log.timestamp}</span>
                <Badge variant={getBadgeVariant(log.level)} className="uppercase text-xs">{log.level}</Badge>
                <div className="flex-1">
                  <p>{log.message}</p>
                  {log.data && (
                    <pre className="mt-1 text-muted-foreground text-xs bg-secondary p-1 rounded-sm overflow-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
