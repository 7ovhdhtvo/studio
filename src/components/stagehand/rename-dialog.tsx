
"use client";

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import type { AudioFile } from '@/lib/storage-manager';

type RenameDialogProps = {
  track: AudioFile | null;
  onSave: (id: string, newTitle: string) => void;
  onClose: () => void;
};

export default function RenameDialog({ track, onSave, onClose }: RenameDialogProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (track) {
      setTitle(track.title);
    }
  }, [track]);

  const handleSave = () => {
    if (track && title.trim()) {
      onSave(track.id, title.trim());
    }
  };
  
  const isOpen = !!track;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Track</DialogTitle>
          <DialogDescription>
            Enter a new title for the track "{track?.originalName}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="track-title" className="text-right">
              Title
            </Label>
            <Input
              id="track-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
