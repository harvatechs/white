"use client";

import { useCallback, useRef, useState } from "react";

// useVoiceRecorder — wraps the browser MediaRecorder API to capture audio,
// returns a base64-encoded blob ready to POST to /api/asr.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice search needs microphone access and a secure (https) connection.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone access denied.";
      setError(msg);
    }
  }, []);

  const stop = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr || mr.state === "inactive") {
        setRecording(false);
        resolve(null);
        return;
      }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // cleanup
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          mediaRef.current = null;
          setRecording(false);
          resolve(result);
        };
        reader.readAsDataURL(blob);
      };
      mr.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      mr.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setError(null);
  }, []);

  return { recording, error, start, stop, cancel };
}
