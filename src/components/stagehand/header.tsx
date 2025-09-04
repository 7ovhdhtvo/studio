
"use client";

import { Speaker, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import LibraryToggleIcon from './library-toggle-icon';

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
        <Button variant="ghost" size="icon" disabled>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

type HeaderProps = {
  onToggleLibrary: () => void;
};

export default function Header({ onToggleLibrary }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 lg:px-8 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleLibrary}>
          <LibraryToggleIcon className="h-6 w-6" />
          <span className="sr-only">Toggle Library</span>
        </Button>
        <h1 className="text-xl font-bold tracking-wider">
          AD PLAYBACK
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Speaker className="h-4 w-4" />
          <span>MacBook Pro Speakers</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
