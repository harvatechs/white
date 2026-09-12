"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useWhite } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function VoiceSearchButton({ onTranscript, size = "md", className }: VoiceSearchButtonProps) {
  const { recording: isMediaRecording, error: mediaError, start: startMedia, stop: stopMedia, cancel: cancelMedia } = useVoiceRecorder();
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const isRecording = isSpeechRecording || isMediaRecording;

  const handleClick = async () => {
    if (transcribing) return;

    // Check if browser natively supports SpeechRecognition
    const SpeechRec =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (SpeechRec) {
      if (isSpeechRecording) {
        // Stop native speech recognition
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {}
        }
        setIsSpeechRecording(false);
        return;
      }

      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

        recognition.onstart = () => {
          setIsSpeechRecording(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript && transcript.trim()) {
            onTranscript(transcript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          setIsSpeechRecording(false);
          if (event.error !== "no-speech" && event.error !== "aborted") {
            toast({
              title: "Voice recognition notice",
              description: event.error === "not-allowed" ? "Microphone permission denied." : "Could not hear audio.",
              variant: "destructive",
            });
          }
        };

        recognition.onend = () => {
          setIsSpeechRecording(false);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fallback to media recorder below
      }
    }

    // Fallback for browsers without native Web Speech API (e.g. desktop Firefox)
    if (isMediaRecording) {
      setTranscribing(true);
      const base64 = await stopMedia();
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
      await startMedia();
      if (mediaError) {
        toast({ title: "Microphone unavailable", description: mediaError, variant: "destructive" });
      }
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speechRecognitionRef.current && isSpeechRecording) {
      try {
        speechRecognitionRef.current.abort();
      } catch {}
      setIsSpeechRecording(false);
    }
    cancelMedia();
  };

  const dim = size === "sm" ? "size-4" : "size-5";
  const btnDim = size === "sm" ? "size-8" : "size-9";
  const recording = isRecording;

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
