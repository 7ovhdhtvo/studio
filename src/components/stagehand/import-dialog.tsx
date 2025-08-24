"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud } from 'lucide-react';

export default function ImportDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full">
          <UploadCloud className="mr-2 h-4 w-4" />
          Import Tracks
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Audio</DialogTitle>
          <DialogDescription>
            Add new audio tracks to your library from your computer or the cloud.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="computer">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="computer">From Computer</TabsTrigger>
            <TabsTrigger value="cloud">From Cloud</TabsTrigger>
          </TabsList>
          <TabsContent value="computer">
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-accent">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-muted-foreground">MP3, WAV, or FLAC</p>
                      </div>
                      <input id="dropzone-file" type="file" className="hidden" />
                  </label>
              </div>
            </div>
             <DialogFooter>
              <Button type="submit">Import</Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="cloud">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link" className="text-right">
                  Link
                </Label>
                <Input id="link" placeholder="https://example.com/audio.mp3" className="col-span-3" />
              </div>
               <p className="text-xs text-center text-muted-foreground pt-2">
                Paste a link to an audio or video file.
              </p>
            </div>
             <DialogFooter>
              <Button type="submit">Import from Link</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
