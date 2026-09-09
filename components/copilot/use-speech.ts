'use client';
import { useRef, useState, useEffect } from 'react';
import { api } from './shared';
import type { Language } from '@/lib/copilot/types';
export function useSpeech(
  id: string,
  onPartial: (s: string) => void,
  onError: (s: string) => void,
) {
  const [recording, setRecording] = useState(false),
    [reconnecting, setReconnecting] = useState(false);
  const stream = useRef<MediaStream | null>(null),
    socket = useRef<WebSocket | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    audioContext = useRef<AudioContext | null>(null),
    worklet = useRef<AudioWorkletNode | null>(null);
  const alive = useRef(true),
    wanted = useRef(false),
    generation = useRef(0),
    attempts = useRef(0),
    provider = useRef('deepgram');
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null),
    retry = useRef<ReturnType<typeof setTimeout> | null>(null),
    queue = useRef(Promise.resolve());
  const callbacks = useRef({ onPartial, onError });
  callbacks.current = { onPartial, onError };
  const settings = useRef<{
    language: Language;
    generate: boolean;
    speaker: 'Client' | 'Consultant';
  }>({ language: 'English', generate: true, speaker: 'Client' });
  const releaseCapture = () => {
    if (heartbeat.current) clearInterval(heartbeat.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    worklet.current?.disconnect();
    worklet.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const clean = () => {
    if (retry.current) clearTimeout(retry.current);
    releaseCapture();
    socket.current?.close();
    socket.current = null;
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      wanted.current = false;
      generation.current++;
      clean();
    };
  }, []);
  const start = async (
    language: Language,
    responseLanguage: Language,
    clientSpeaker = 0,
    generate = true,
  ) => {
    const attempt = ++generation.current;
    wanted.current = true;
    settings.current = {
      ...settings.current,
      language: responseLanguage,
      generate,
    };
    const current = () =>
      alive.current && wanted.current && attempt === generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'Microphone capture is unavailable. Enter transcript text manually.',
        );
      const grant = await api<{
        provider?: string;
        token?: string;
        url: string;
      }>('speech', { consultation_id: id, language });
      if (!current()) return;
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!current()) {
        acquired.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = acquired;
      provider.current = grant.provider || 'deepgram';
      const isSarvam = provider.current === 'sarvam';
      const wsUrl = new URL(grant.url, window.location.origin);
      if (isSarvam)
        wsUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = isSarvam
        ? new WebSocket(wsUrl)
        : new WebSocket(wsUrl, ['bearer', grant.token!]);
      socket.current = ws;
      const connectionId = crypto.randomUUID();
      let sequence = 0;
      const publish = (
        text: string,
        spokenLanguage: string,
        confidence: number,
        speaker: 'Client' | 'Consultant',
      ) => {
        const external_id = `mic-${connectionId}-${sequence++}`,
          preferences = { ...settings.current };
        queue.current = queue.current
          .then(async () => {
            await api('transcription', {
              consultation_id: id,
              text,
              speaker,
              external_id,
              language: spokenLanguage,
              response_language: preferences.language,
              confidence,
              generate: preferences.generate,
            });
          })
          .catch((e) => callbacks.current.onError(e.message));
      };
      ws.onopen = async () => {
        if (!current()) {
          ws.close();
          return;
        }
        setRecording(true);
        setReconnecting(false);
        try {
          if (isSarvam) {
            const context = new AudioContext();
            audioContext.current = context;
            await context.audioWorklet.addModule('/copilot-audio-worklet.js');
            if (!current()) {
              void context.close();
              return;
            }
            await context.resume();
            const node = new AudioWorkletNode(context, 'copilot-pcm');
            worklet.current = node;
            node.port.onmessage = (e) => {
              if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
            };
            const source = context.createMediaStreamSource(acquired),
              silence = context.createGain();
            silence.gain.value = 0;
            source.connect(node);
            node.connect(silence);
            silence.connect(context.destination);
          } else {
            const mime = [
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/ogg;codecs=opus',
            ].find((t) => MediaRecorder.isTypeSupported(t));
            if (!mime)
              throw new Error(
                'This browser cannot provide a supported audio format. Use manual transcription.',
              );
            const media = new MediaRecorder(acquired, { mimeType: mime });
            recorder.current = media;
            media.ondataavailable = (e) => {
              if (e.data.size && ws.readyState === WebSocket.OPEN)
                ws.send(e.data);
            };
            media.start(250);
            heartbeat.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: 'KeepAlive' }));
            }, 5000);
          }
        } catch (e) {
          callbacks.current.onError((e as Error).message);
          wanted.current = false;
          clean();
          setRecording(false);
        }
      };
      ws.onmessage = (e) => {
        try {
          const b = JSON.parse(e.data);
          if (isSarvam) {
            const type = b.event || b.type;
            if (type === 'transcript.partial') {
              callbacks.current.onPartial(b.text || '');
              return;
            }
            if (type === 'transcript.final' && b.text) {
              attempts.current = 0;
              callbacks.current.onPartial('');
              publish(
                b.text,
                b.language || language,
                typeof b.confidence === 'number' ? b.confidence : 0,
                settings.current.speaker,
              );
            }
            if (type === 'error')
              callbacks.current.onError(
                'The speech provider reported an error. Reconnect or use manual transcription.',
              );
            return;
          }
          if (b.type !== 'Results') return;
          const a = b.channel?.alternatives?.[0];
          if (!a?.transcript) return;
          if (!b.is_final) {
            callbacks.current.onPartial(a.transcript);
            return;
          }
          attempts.current = 0;
          callbacks.current.onPartial('');
          const words = a.words || [];
          if (!words.length) {
            publish(
              a.transcript,
              language,
              a.confidence || 0,
              settings.current.speaker,
            );
            return;
          }
          let group: string[] = [],
            label = words[0].speaker;
          for (const word of words) {
            if (word.speaker !== label && group.length) {
              publish(
                group.join(' '),
                language,
                a.confidence || 0,
                label === clientSpeaker ? 'Client' : 'Consultant',
              );
              group = [];
              label = word.speaker;
            }
            group.push(word.punctuated_word || word.word);
          }
          if (group.length)
            publish(
              group.join(' '),
              language,
              a.confidence || 0,
              typeof label === 'number'
                ? label === clientSpeaker
                  ? 'Client'
                  : 'Consultant'
                : settings.current.speaker,
            );
        } catch {
          callbacks.current.onError(
            'A speech response could not be read. Transcription will continue.',
          );
        }
      };
      ws.onerror = () => {
        if (current())
          callbacks.current.onError(
            'Speech connection interrupted. Reconnecting…',
          );
      };
      ws.onclose = () => {
        if (!alive.current || attempt !== generation.current) return;
        releaseCapture();
        setRecording(false);
        if (wanted.current && attempts.current < 3) {
          setReconnecting(true);
          attempts.current++;
          retry.current = setTimeout(
            () =>
              start(
                language,
                settings.current.language,
                clientSpeaker,
                settings.current.generate,
              ),
            1000 * 2 ** attempts.current,
          );
        } else if (wanted.current) {
          setReconnecting(false);
          callbacks.current.onError(
            'Speech is disconnected. Select Start microphone to reconnect.',
          );
        }
      };
    } catch (e) {
      if (attempt !== generation.current) return;
      wanted.current = false;
      clean();
      if (alive.current) {
        setRecording(false);
        setReconnecting(false);
        callbacks.current.onError((e as Error).message);
      }
    }
  };
  const stop = async () => {
    wanted.current = false;
    if (retry.current) clearTimeout(retry.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    worklet.current?.disconnect();
    if (socket.current?.readyState === WebSocket.OPEN) {
      await new Promise((r) => setTimeout(r, 150));
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send(
          JSON.stringify(
            provider.current === 'sarvam'
              ? { event: 'end' }
              : { type: 'Finalize' },
          ),
        );
      await new Promise((r) => setTimeout(r, 700));
    }
    await queue.current;
    generation.current++;
    clean();
    if (alive.current) {
      setRecording(false);
      setReconnecting(false);
    }
  };
  return {
    recording,
    reconnecting,
    start,
    stop,
    configure: (
      language: Language,
      generate: boolean,
      speaker: 'Client' | 'Consultant' = 'Client',
    ) => {
      settings.current = { language, generate, speaker };
    },
  };
}
