"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useWhite } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function VoiceSearchButton({ onTranscript, size = "md", className }: VoiceSearchButtonProps) {
  const { recording, error, start, stop, cancel } = useVoiceRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (transcribing) return;
    if (recording) {
      setTranscribing(true);
      const base64 = await stop();
      setTranscribing(false);
      if (!base64) return;
      try {
        const r = await fetch("/api/asr", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ audio: base64 }),
        });
        const d = await r.json();
        if (d.error) {
          toast({ title: "Voice search", description: d.error, variant: "destructive" });
        } else if (d.text) {
          onTranscript(d.text);
        }
      } catch {
        toast({ title: "Voice search failed", description: "Please try again.", variant: "destructive" });
      }
    } else {
      await start();
      if (error) {
        toast({ title: "Microphone unavailable", description: error, variant: "destructive" });
      }
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancel();
  };

  const dim = size === "sm" ? "size-4" : "size-5";
  const btnDim = size === "sm" ? "size-8" : "size-9";

  return (
    <div className={cn("relative flex items-center", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={transcribing}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full transition-all",
          btnDim,
          recording
            ? "text-white"
            : "text-foreground/40 hover:text-foreground/70 hover:ws-whisper",
          transcribing && "opacity-60"
        )}
        style={recording ? { background: "var(--destructive)" } : undefined}
        aria-label={recording ? "Stop recording" : "Search by voice"}
        title={recording ? "Stop recording" : "Search by voice"}
      >
        {transcribing ? (
          <Loader2 className={cn(dim, "animate-spin")} strokeWidth={1.75} />
        ) : recording ? (
          <Mic className={dim} strokeWidth={1.75} />
        ) : (
          <Mic className={dim} strokeWidth={1.75} />
        )}
      </button>

      {/* recording indicator + cancel */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, x: -4, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -4, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div className="flex items-center gap-1 px-1">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{ background: "var(--destructive)" }}
                  animate={{ height: [6, 14, 6] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="flex size-6 items-center justify-center rounded-full text-foreground/40 hover:bg-foreground/5 hover:text-foreground/70 transition-colors"
              aria-label="Cancel recording"
            >
              <X className="size-3.5" strokeWidth={1.75} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pulse ring while recording */}
      {recording && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "0 0 0 0 var(--destructive)",
            animation: "ws-mic-pulse 1.6s ease-out infinite",
          }}
        />
      )}
    </div>
  );
}
