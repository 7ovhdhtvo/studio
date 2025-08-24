"use client";

import { Speaker } from 'lucide-react';
import MetronomeControl from './metronome-control';

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 lg:px-8 flex-shrink-0">
      <h1 className="text-xl font-bold tracking-wider" style={{ color: '#34495E' }}>
        STAGEHAND
      </h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Speaker className="h-4 w-4" />
          <span>MacBook Pro Speakers</span>
        </div>
        <MetronomeControl />
      </div>
    </header>
  );
}
