'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  AudioLines,
  FileText,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Clock3,
  Globe,
  Pause,
  Play,
  Send,
  Check,
  ThumbsUp,
  ThumbsDown,
  TriangleAlert,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Pin,
  Save,
  Download,
  LoaderCircle,
  Radio,
  Plus,
  RefreshCw,
  X,
  Search,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ConsultationDetail,
  Suggestion,
  Segment,
  Profile,
  Language,
  Source,
} from '@/lib/copilot/types';
import {
  useApp,
  api,
  initials,
  time,
  dateKey,
  duration,
  Badge,
  Empty,
  Loading,
  Modal,
  SearchBox,
} from './shared';
import { useSpeech } from './use-speech';
export default function LiveWorkspace({ id }: { id: string }) {
  const { data, notify, view, refresh, source } = useApp();
  const [c, setC] = useState<ConsultationDetail | null>(null),
    [error, setError] = useState(''),
    [tab, setTab] = useState('transcript'),
    [partial, setPartial] = useState(''),
    [thinking, setThinking] = useState(''),
    [connected, setConnected] = useState(false),
    [playing, setPlaying] = useState(false),
    [finished, setFinished] = useState(false),
    [copilot, setCopilot] = useState(data.user.settings.autoCopilot),
    [responseLanguage, setResponseLanguage] = useState<Language>(
      data.user.settings.language,
    ),
    [speechLanguage, setSpeechLanguage] = useState<Language>('Auto'),
    [manual, setManual] = useState(''),
    [speaker, setSpeaker] = useState('Client'),
    [notes, setNotes] = useState(''),
    [notesState, setNotesState] = useState(''),
    [summary, setSummary] = useState(''),
    [summaryOpen, setSummaryOpen] = useState(false),
    [endOpen, setEndOpen] = useState(false),
    [speechOpen, setSpeechOpen] = useState(false),
    [clientSpeaker, setClientSpeaker] = useState('0'),
    [busy, setBusy] = useState(''),
    [elapsed, setElapsed] = useState(0),
    [camera, setCamera] = useState(false),
    [sharing, setSharing] = useState(false),
    [search, setSearch] = useState(''),
    [results, setResults] = useState<Source[]>([]),
    [searching, setSearching] = useState(false),
    [pinned, setPinned] = useState<Source[]>([]),
    [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null),
    [followupOpen, setFollowupOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null),
    videoStream = useRef<MediaStream | null>(null),
    shareStream = useRef<MediaStream | null>(null),
    scrollRef = useRef<HTMLDivElement | null>(null),
    atBottom = useRef(true),
    simBusy = useRef(false),
    cRef = useRef(c);
  cRef.current = c;
  const readonly = data.user.role === 'Supervisor',
    live = c?.status === 'Live';
  const speech = useSpeech(id, setPartial, setError);
  const load = useCallback(async () => {
    const item = await api<ConsultationDetail>(`consultations/${id}`);
    setC(item);
    setNotes(item.notes || '');
    setSummary(item.summary || '');
    return item;
  }, [id]);
  useEffect(() => {
    let active = true;
    load()
      .then((item) => {
        if (active && item.demo && item.status === 'Live' && !readonly)
          setPlaying(true);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
      videoStream.current?.getTracks().forEach((t) => t.stop());
      shareStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [load, readonly]);
  useEffect(() => {
    if (!c) return;
    const start = Date.parse(c.started_at || new Date().toISOString());
    const update = () =>
      setElapsed(
        c.status === 'Completed'
          ? c.duration || 0
          : Math.max(0, Math.floor((Date.now() - start) / 1000)),
      );
    update();
    if (c.status !== 'Live') return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [c?.started_at, c?.status, c?.duration]);
  useEffect(() => {
    if (!c || c.status === 'Live') return;
    setPlaying(false);
    void speech.stop();
    videoStream.current?.getTracks().forEach((t) => t.stop());
    shareStream.current?.getTracks().forEach((t) => t.stop());
    setCamera(false);
    setSharing(false);
    setThinking('');
  }, [c?.status]);
  useEffect(() => {
    speech.configure(
      responseLanguage,
      copilot,
      speaker as 'Client' | 'Consultant',
    );
  }, [responseLanguage, copilot, speaker]);
  useEffect(() => {
    if (!live) return;
    const es = new EventSource(`/api/copilot/consultations/${id}/events`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    const types = [
      'transcript.partial',
      'transcript.final',
      'question.detected',
      'ai.thinking',
      'ai.answer',
      'ai.followup',
      'client.profile.updated',
      'alert.created',
      'consultation.started',
      'consultation.ended',
      'ai.error',
      'connection.error',
    ];
    for (const type of types)
      es.addEventListener(type, (e) => {
        const payload = JSON.parse((e as MessageEvent).data);
        if (type === 'transcript.partial') setPartial(payload.text);
        if (type === 'transcript.final') {
          setPartial('');
          setC((old) =>
            old
              ? {
                  ...old,
                  transcript: old.transcript.some((t) => t.id === payload.id)
                    ? old.transcript
                    : [...old.transcript, payload],
                }
              : old,
          );
        }
        if (type === 'ai.thinking') setThinking(payload.text);
        if (type === 'ai.answer') {
          setThinking('');
          setC((old) =>
            old
              ? {
                  ...old,
                  suggestions: old.suggestions.some((s) => s.id === payload.id)
                    ? old.suggestions
                    : [...old.suggestions, payload],
                }
              : old,
          );
          setSelectedSuggestion(payload.id);
        }
        if (type === 'client.profile.updated')
          setC((old) => (old ? { ...old, profile: payload } : old));
        if (type === 'alert.created')
          setC((old) =>
            old
              ? {
                  ...old,
                  alerts: old.alerts.some((a) => a.id === payload.id)
                    ? old.alerts
                    : [...old.alerts, payload],
                }
              : old,
          );
        if (type === 'consultation.ended') {
          setPlaying(false);
          setC((old) => (old ? { ...old, ...payload } : old));
          setSummary(payload.summary || '');
        }
        if (type === 'ai.error') {
          setThinking('');
          setError(payload.message);
        }
        if (type === 'connection.error') {
          setConnected(false);
          setError(payload.message);
        }
      });
    return () => {
      es.close();
      setConnected(false);
    };
  }, [id, live]);
  useEffect(() => {
    if (atBottom.current)
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
  }, [c?.transcript.length, partial]);
  useEffect(() => {
    if (!playing || !live || !c?.demo || readonly || finished) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      if (simBusy.current) {
        timer = setTimeout(tick, 500);
        return;
      }
      simBusy.current = true;
      try {
        const res = await api(`consultations/${id}/simulate`, {
          language: responseLanguage,
          generate: copilot,
        });
        if (res.done) {
          setFinished(true);
          setPlaying(false);
        }
      } catch (e) {
        if (!stopped) {
          setError((e as Error).message);
          setPlaying(false);
        }
      } finally {
        simBusy.current = false;
        if (!stopped) timer = setTimeout(tick, 3500);
      }
    };
    timer = setTimeout(tick, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [
    playing,
    live,
    c?.demo,
    id,
    readonly,
    finished,
    responseLanguage,
    copilot,
  ]);
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      setSearching(true);
      api<Source[]>('knowledge/search?q=' + encodeURIComponent(search))
        .then((r) => {
          if (active) setResults(r);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);
  const save = async (text = notes) => {
    setNotesState('Saving…');
    try {
      await api(`consultations/${id}/notes`, { text });
      setNotesState('Saved');
    } catch (e) {
      setNotesState('Not saved');
      notify((e as Error).message);
    }
  };
  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    setBusy('transcript');
    try {
      await api('transcription', {
        consultation_id: id,
        text: manual,
        speaker,
        external_id: crypto.randomUUID(),
        generate: copilot,
        response_language: responseLanguage,
        confidence: 1,
      });
      setManual('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const feedback = async (s: Suggestion, value: string) => {
    try {
      await api('ai/feedback', { suggestion_id: s.id, value });
      setC((old) =>
        old
          ? {
              ...old,
              suggestions: old.suggestions.map((x) =>
                x.id === s.id ? { ...x, feedback: value } : x,
              ),
            }
          : old,
      );
      notify(
        value === 'Helpful'
          ? 'Answer marked helpful.'
          : `Feedback saved: ${value}.`,
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const ask = async (text: string) => {
    try {
      await api(`consultations/${id}/followups`, { text, status: 'Asked' });
      await api('transcription', {
        consultation_id: id,
        text,
        speaker: 'Consultant',
        external_id: crypto.randomUUID(),
        generate: false,
        confidence: 1,
      });
      notify('Question marked as asked and added to the transcript.');
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const end = async () => {
    setBusy('end');
    setPlaying(false);
    try {
      await speech.stop();
      await save();
      const result = await api(`consultations/${id}/end`, {});
      setSummary(result.summary);
      setSummaryOpen(true);
      setEndOpen(false);
      await load();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const toggleCamera = async () => {
    if (camera) {
      videoStream.current?.getTracks().forEach((t) => t.stop());
      setCamera(false);
      return;
    }
    try {
      videoStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = videoStream.current;
      }, 0);
    } catch {
      setError('Camera access is unavailable. The consultation can continue.');
    }
  };
  const toggleShare = async () => {
    if (sharing) {
      shareStream.current?.getTracks().forEach((t) => t.stop());
      setSharing(false);
      return;
    }
    try {
      shareStream.current = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setSharing(true);
      shareStream.current.getVideoTracks()[0].onended = () => setSharing(false);
      notify(
        'Local screen capture started. A meeting provider is needed to send it to a remote client.',
      );
    } catch {
      setError('Screen sharing was cancelled or unavailable.');
    }
  };
  const pin = async (s: Source) => {
    setPinned((p) => (p.some((x) => x.id === s.id) ? p : [...p, s]));
    const text =
      notes +
      `\n\nPinned source: ${s.title} · ${s.section}\n${s.excerpt.slice(0, 600)}`;
    setNotes(text);
    await save(text);
    notify('Source pinned and saved to your notes.');
  };
  if (!c)
    return error ? (
      <div className="cp-main">
        <div className="cp-error">{error}</div>
        <Button onClick={() => load().catch((e) => setError(e.message))}>
          Retry
        </Button>
      </div>
    ) : (
      <Loading />
    );
  const answer =
    c.suggestions.find((s) => s.id === selectedSuggestion) ||
    c.suggestions.at(-1);
  const profileLabels: Record<string, string> = {
    company: 'Company',
    industry: 'Industry',
    location: 'Location',
    turnover: 'Annual turnover',
    employees: 'Employees',
    investment: 'Investment',
    udyam: 'Udyam',
    gst: 'GST status',
    stage: 'Business stage',
    funding: 'Funding need',
    problem: 'Problem',
    requirements: 'Requirements',
  };
  return (
    <div className="cp-live">
      <div className="cp-live-heading">
        <div>
          <button
            className="cp-icon-btn"
            aria-label="Back to consultations"
            onClick={() => {
              if (notesState === 'Unsaved') save();
              view('consultations');
            }}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1>{c.topic}</h1>
            <span>
              {c.company} <i /> {dateKey(c.start)}
            </span>
          </div>
        </div>
        <div>
          <Badge status={c.status} />
          <span className="cp-call-timer">
            <Clock3 size={14} />
            {duration(elapsed)}
          </span>
          {c.status === 'Completed' && (
            <Button variant="outline" onClick={() => setSummaryOpen(true)}>
              <FileText size={14} /> Review summary
            </Button>
          )}
          {live && !readonly && (
            <Button variant="destructive" onClick={() => setEndOpen(true)}>
              <PhoneOff size={14} /> End consultation
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="cp-live-error" role="alert">
          <TriangleAlert size={15} />
          {error}
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="cp-live-columns">
        <aside className="cp-meeting-column">
          <section className="cp-panel cp-meeting">
            <div className="cp-meeting-preview">
              {camera ? (
                <video ref={videoRef} autoPlay playsInline muted />
              ) : (
                <>
                  <span className="cp-client-orb">{initials(c.client)}</span>
                  <h2>{c.client}</h2>
                  <p>{c.company}</p>
                  <span className="cp-meeting-audio">
                    <AudioLines size={17} />
                    {c.demo ? 'Demo meeting' : 'Meeting preview'}
                  </span>
                </>
              )}
              <span className="cp-meeting-label">
                {camera
                  ? 'You · local camera'
                  : c.demo
                    ? 'SIMULATION'
                    : 'LOCAL PREVIEW'}
              </span>
            </div>
            <div className="cp-call-controls">
              <button
                disabled={!live || readonly}
                className={speech.recording ? 'on' : ''}
                onClick={() =>
                  speech.recording ? speech.stop() : setSpeechOpen(true)
                }
                aria-label={
                  speech.recording ? 'Mute microphone' : 'Start microphone'
                }
                title={
                  speech.recording ? 'Mute microphone' : 'Start microphone'
                }
              >
                {speech.recording ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                disabled={!live || readonly}
                className={camera ? 'on' : ''}
                onClick={toggleCamera}
                aria-label={camera ? 'Turn camera off' : 'Turn camera on'}
                title="Local camera"
              >
                {camera ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                disabled={!live || readonly}
                className={sharing ? 'on' : ''}
                onClick={toggleShare}
                aria-label={
                  sharing ? 'Stop screen share' : 'Start screen share'
                }
                title="Screen capture"
              >
                <ScreenShare size={18} />
              </button>
            </div>
            <div className="cp-meeting-bottom">
              <ShieldCheck size={13} />
              {c.demo
                ? 'A simulated consultation'
                : 'Local preview · no remote meeting connected'}
            </div>
          </section>
          <section className="cp-panel cp-profile">
            <div className="cp-section-title">
              <h2>
                <Building2 size={15} /> Client profile
              </h2>
              <span className="cp-mini-tag">LIVE MEMORY</span>
            </div>
            <dl>
              {Object.entries(profileLabels).map(([key, label]) =>
                key === 'problem' || key === 'requirements' ? null : (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {c.profile[key as keyof Profile] || (
                        <span>Not established</span>
                      )}
                    </dd>
                  </div>
                ),
              )}
            </dl>
            <div className="cp-profile-note">
              <Sparkles size={13} /> Captured from the conversation. Verify with
              the client.
            </div>
          </section>
          {c.followups.length > 0 && (
            <section className="cp-panel cp-followup-record">
              <h3>Saved follow-ups</h3>
              {c.followups.map((f) => (
                <p key={f.id}>
                  {f.text}
                  <small>
                    {f.status}
                    {f.due && ' · ' + f.due}
                  </small>
                </p>
              ))}
            </section>
          )}
        </aside>
        <section className="cp-panel cp-transcript-column">
          <div className="cp-work-tabs">
            {[
              { id: 'transcript', label: 'Transcript', icon: AudioLines },
              { id: 'notes', label: 'Notes', icon: FileText },
              { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
            ].map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'transcript' ? (
            <>
              <div className="cp-transcript-status">
                <span>
                  <i className={connected ? 'connected' : ''} />
                  {live
                    ? connected
                      ? 'Live transcript'
                      : 'Reconnecting…'
                    : 'Consultation transcript'}
                </span>
                <span>{c.transcript.length} segments</span>
              </div>
              <div
                className="cp-transcript-feed"
                ref={scrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  atBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                }}
                role="log"
                aria-label="Live conversation transcript"
              >
                {!c.transcript.length && !partial && (
                  <Empty
                    title={
                      c.demo
                        ? 'The conversation is about to begin'
                        : 'Ready when you are'
                    }
                    detail={
                      c.demo
                        ? 'Simulated speech will appear here. Your copilot listens for the right moment to help.'
                        : 'Start the microphone or add a transcript segment below.'
                    }
                  />
                )}{' '}
                {c.transcript.map((s) => (
                  <article
                    className={'cp-segment ' + s.speaker.toLowerCase()}
                    key={s.id}
                  >
                    <div className="cp-segment-meta">
                      <span
                        className={
                          'cp-avatar cp-avatar-sm ' +
                          (s.speaker === 'Consultant' ? 'cp-tone-2' : '')
                        }
                      >
                        {s.speaker === 'Client'
                          ? initials(c.client)
                          : initials(
                              data.consultants.find(
                                (x) => x.id === c.consultant_id,
                              )?.name || 'Consultant',
                            )}
                      </span>
                      <b>{s.speaker === 'Client' ? c.client : 'Consultant'}</b>
                      <time>{time(s.timestamp)}</time>
                    </div>
                    <div className="cp-segment-text">{s.text}</div>
                    <small>
                      <Globe size={10} />
                      {s.language}
                      <span>
                        {s.confidence
                          ? Math.round(s.confidence * 100) +
                            '% transcription confidence'
                          : 'Confidence not supplied'}
                      </span>
                    </small>
                  </article>
                ))}
                {partial && (
                  <article className="cp-segment cp-partial">
                    <div className="cp-segment-meta">
                      <AudioLines size={15} />
                      <b>Listening…</b>
                    </div>
                    <div className="cp-segment-text">
                      {partial}
                      <span className="cp-caret" />
                    </div>
                  </article>
                )}
              </div>
              {c.demo && live && !readonly && (
                <div className="cp-simulation-controls">
                  <span>
                    <Radio size={14} />
                    {finished
                      ? 'Scenario complete · continue manually'
                      : 'Simulated conversation'}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={finished}
                    onClick={() => setPlaying((v) => !v)}
                  >
                    {playing ? <Pause size={13} /> : <Play size={13} />}{' '}
                    {playing ? 'Pause' : 'Play'}
                  </Button>
                </div>
              )}
              {live && !readonly && (
                <form className="cp-manual-form" onSubmit={addManual}>
                  <div>
                    <select
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      aria-label="Transcript speaker"
                    >
                      <option>Client</option>
                      <option>Consultant</option>
                    </select>
                    <span>Manual transcript</span>
                  </div>
                  <div>
                    <textarea
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      placeholder="Add what was said…"
                      rows={2}
                      maxLength={6000}
                      aria-label="Manual transcript text"
                    />
                    <Button
                      type="submit"
                      disabled={!manual.trim() || busy === 'transcript'}
                      size="icon"
                      aria-label="Add transcript segment"
                    >
                      {busy === 'transcript' ? (
                        <LoaderCircle size={16} className="cp-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : tab === 'notes' ? (
            <div className="cp-notes-work">
              <div className="cp-section-title">
                <h2>Consultant notes</h2>
                <span>{notesState}</span>
              </div>
              <p>Your private notes for this consultation.</p>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesState('Unsaved');
                }}
                disabled={readonly}
                placeholder="Capture the important details, decisions and next steps…"
                aria-label="Consultant notes"
                maxLength={50000}
              />
              <div className="cp-row">
                <Button
                  variant="outline"
                  disabled={readonly || !!busy}
                  onClick={async () => {
                    setBusy('notes');
                    try {
                      const r = await api(`consultations/${id}/notes`, {
                        generate: true,
                      });
                      setNotes(r.notes);
                      setNotesState('Saved');
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy('');
                    }
                  }}
                >
                  <Sparkles size={14} /> Generate notes
                </Button>
                <Button disabled={readonly || !!busy} onClick={() => save()}>
                  <Save size={14} /> Save notes
                </Button>
              </div>
              <Button
                variant="ghost"
                disabled={readonly}
                onClick={() => setFollowupOpen(true)}
              >
                <Plus size={14} /> Schedule a follow-up
              </Button>
            </div>
          ) : (
            <div className="cp-knowledge-work">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search knowledge base…"
              />
              {pinned.length > 0 && (
                <div className="cp-pinned">
                  <Pin size={13} />
                  {pinned.length} source{pinned.length > 1 ? 's' : ''} pinned to
                  notes
                </div>
              )}
              {searching && <p>Searching approved sources…</p>}
              {results.map((s) => (
                <article key={s.id}>
                  <span className="cp-mini-tag">APPROVED SOURCE</span>
                  <h3>{s.title}</h3>
                  <p>{s.excerpt.slice(0, 300)}…</p>
                  <small>
                    {s.section} · Updated {dateKey(s.updated)}
                  </small>
                  <div className="cp-row">
                    <button
                      className="cp-text-button"
                      onClick={() => source(s)}
                    >
                      Read source <ArrowUpRight size={13} />
                    </button>
                    <button
                      className="cp-text-button"
                      disabled={readonly}
                      onClick={() => pin(s)}
                    >
                      <Pin size={13} /> Pin to notes
                    </button>
                  </div>
                </article>
              ))}
              {!results.length && !searching && (
                <Empty
                  title={
                    search
                      ? 'No approved sources found'
                      : 'Knowledge, without leaving the call'
                  }
                  detail={
                    search
                      ? 'Try a different term or ask your admin to add a trusted source.'
                      : 'Search your library for schemes, finance, compliance and more.'
                  }
                />
              )}
            </div>
          )}
        </section>
        <aside className="cp-panel cp-ai-column">
          <div className="cp-ai-header">
            <span className="cp-ai-mark">
              <Sparkles size={20} />
            </span>
            <div>
              <h2>AI Consultant Copilot</h2>
              <small>
                <ShieldCheck size={10} /> Visible only to your team
              </small>
            </div>
            <button
              className={'cp-toggle ' + (copilot ? 'on' : '')}
              onClick={() => setCopilot((v) => !v)}
              disabled={readonly || !live}
              aria-label={copilot ? 'Pause AI copilot' : 'Start AI copilot'}
              aria-pressed={copilot}
            >
              <span />
            </button>
          </div>
          <div className="cp-ai-language">
            <span>
              <Globe size={13} /> Response language
            </span>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value as Language)}
              aria-label="Consultant response language"
            >
              <option>Auto</option>
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
            </select>
          </div>
          <div className="cp-ai-scroll">
            {thinking && (
              <div className="cp-thinking" role="status">
                <Sparkles size={16} className="cp-breathe" />
                <span>
                  AI is analyzing…<small>{thinking}</small>
                </span>
              </div>
            )}
            {!copilot && live && (
              <div className="cp-info">
                AI assistance paused. Your transcript continues.
              </div>
            )}
            {answer ? (
              <>
                <div className="cp-question-card">
                  <span className="cp-eyebrow">
                    {answer.type === 'followup'
                      ? 'A MOMENT TO EXPLORE'
                      : 'CLIENT QUESTION DETECTED'}
                  </span>
                  <p>“{answer.question}”</p>
                </div>
                <AnswerCard
                  answer={answer}
                  feedback={feedback}
                  readonly={readonly}
                  onSource={source}
                />
                <div className="cp-followup-suggestions">
                  <div>
                    <h3>
                      <MessageSquare size={15} /> Suggested follow-ups
                    </h3>
                    <small>Keep the conversation moving.</small>
                  </div>
                  {answer.followups.map((q, i) => (
                    <div key={q}>
                      <span>{i + 1}</span>
                      <p>{q}</p>
                      <button
                        disabled={!live || readonly}
                        onClick={() => ask(q)}
                      >
                        Ask <ArrowUpRight size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              !thinking && (
                <Empty
                  title="A second pair of ears."
                  detail="Your copilot listens for meaningful questions and finds guidance in approved knowledge. No need to leave the conversation."
                />
              )
            )}
            {c.alerts.length > 0 && (
              <div className="cp-alert-list">
                {c.alerts.slice(-3).map((a) => (
                  <div key={a.id}>
                    <TriangleAlert size={15} />
                    <span>
                      <b>{a.type}</b>
                      <p>{a.text}</p>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {c.suggestions.length > 1 && (
              <div className="cp-previous">
                <h3>Earlier suggestions</h3>
                {[...c.suggestions].reverse().map((s, i) => (
                  <button
                    key={s.id}
                    className={s.id === answer?.id ? 'active' : ''}
                    onClick={() => setSelectedSuggestion(s.id)}
                  >
                    <span>
                      {String(c.suggestions.length - i).padStart(2, '0')}
                    </span>
                    {s.question}
                    <ChevronDown size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cp-ai-footer">
            <ShieldCheck size={12} />
            {c.demo
              ? 'Demo guidance · verify before advising'
              : 'AI assists. Your judgment leads.'}
          </div>
        </aside>
      </div>
      <div className="cp-live-footer">
        <span>
          <i className={connected ? 'connected' : ''} />
          {live
            ? connected
              ? 'Connected · live updates'
              : 'Reconnecting to live updates'
            : 'Consultation saved'}{' '}
        </span>
        <span>
          {c.demo
            ? 'Simulation mode'
            : speech.recording
              ? 'Microphone active'
              : speech.reconnecting
                ? 'Reconnecting microphone…'
                : 'Microphone off'}{' '}
          · {c.transcript.length} transcript segments · {c.suggestions.length}{' '}
          suggestions
        </span>
      </div>
      <Modal
        open={endOpen}
        title="Wrap up this consultation?"
        description="Your transcript, suggestions and feedback are already saved. We’ll prepare a summary for you to review."
        close={() => setEndOpen(false)}
      >
        <div className="cp-end-stats">
          <span>
            <Clock3 size={17} />
            {duration(elapsed)}
          </span>
          <span>
            <AudioLines size={17} />
            {c.transcript.length} segments
          </span>
          <span>
            <Sparkles size={17} />
            {c.suggestions.length} suggestions
          </span>
        </div>
        <Button variant="destructive" disabled={busy === 'end'} onClick={end}>
          <PhoneOff size={15} />
          {busy === 'end' ? 'Preparing summary…' : 'End & review summary'}
        </Button>
      </Modal>
      <Modal
        open={summaryOpen}
        title="Consultation summary"
        description="Review the discussion, check the recommendations and save the final handover."
        close={() => setSummaryOpen(false)}
        wide
      >
        <textarea
          className="cp-summary-editor"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          readOnly={readonly}
          aria-label="Editable consultation summary"
          maxLength={50000}
        />
        <div className="cp-form-footer">
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([summary], {
                  type: 'text/plain;charset=utf-8',
                }),
                url = URL.createObjectURL(blob),
                a = document.createElement('a');
              a.href = url;
              a.download = `consultation-${c.id}.txt`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={15} /> Download
          </Button>
          <Button
            disabled={readonly || busy === 'summary'}
            onClick={async () => {
              setBusy('summary');
              try {
                await api(`consultations/${id}/summary`, { summary });
                await refresh();
                setSummaryOpen(false);
                notify('Reviewed summary saved.');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy('');
              }
            }}
          >
            <Check size={15} /> Save reviewed summary
          </Button>
        </div>
      </Modal>
      <Modal
        open={speechOpen}
        title="Start live transcription"
        description="Use a shared microphone with participant consent. Confirm speaker labels during the conversation."
        close={() => setSpeechOpen(false)}
      >
        <label>
          Spoken language
          <select
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value as Language)}
          >
            <option value="Auto">
              {data.providers.stt_provider === 'sarvam'
                ? 'Auto · English, Hindi, Marathi'
                : 'Auto · Hindi + English'}
            </option>
            <option>Marathi</option>
            <option>Hindi</option>
            <option>English</option>
          </select>
        </label>
        <label>
          Client speaker label
          <select
            value={clientSpeaker}
            onChange={(e) => setClientSpeaker(e.target.value)}
          >
            <option value="0">First detected speaker</option>
            <option value="1">Second detected speaker</option>
          </select>
        </label>
        <div className="cp-info">
          {data.providers.stt_provider === 'sarvam'
            ? 'Auto detects English, Hindi and Marathi. Use the Client/Consultant selector below the transcript to label the current speaker.'
            : 'Choose Marathi for Marathi speech. Automatic speaker labels are estimates; verify them before relying on the transcript.'}
        </div>
        <Button
          onClick={async () => {
            setSpeechOpen(false);
            await speech.start(
              speechLanguage,
              responseLanguage,
              Number(clientSpeaker),
              copilot,
            );
          }}
        >
          <Mic size={15} /> Consent confirmed · Start microphone
        </Button>
      </Modal>
      <Modal
        open={followupOpen}
        title="Save a follow-up"
        close={() => setFollowupOpen(false)}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const b = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const f = await api(`consultations/${id}/followups`, {
                ...b,
                status: 'Planned',
              });
              setC((old) =>
                old ? { ...old, followups: [...old.followups, f] } : old,
              );
              setFollowupOpen(false);
              notify('Follow-up saved.');
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <label>
            Next action
            <textarea name="text" required maxLength={6000} />
          </label>
          <label>
            Follow-up date
            <input name="due" type="date" required />
          </label>
          <Button type="submit">Save follow-up</Button>
        </form>
      </Modal>
    </div>
  );
}
function AnswerCard({
  answer,
  feedback,
  readonly,
  onSource,
}: {
  answer: Suggestion;
  feedback: (s: Suggestion, value: string) => Promise<void>;
  readonly: boolean;
  onSource: (s: Source) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="cp-answer-card">
      <div className="cp-answer-title">
        <h3>
          <Sparkles size={16} /> Suggested answer
        </h3>
        <span
          className={
            'cp-confidence ' +
            (answer.confidence === 'Unverified' ? 'unverified' : '')
          }
        >
          {answer.confidence === 'Unverified' ? (
            <TriangleAlert size={12} />
          ) : (
            <ShieldCheck size={12} />
          )}{' '}
          {answer.confidence} evidence
        </span>
      </div>
      <p className="cp-short-answer">{answer.short_answer}</p>
      <ul>
        {answer.key_points.slice(1).map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {(expanded || answer.what_to_check.length > 0) && (
        <div className="cp-check-list">
          <h4>WHAT TO CHECK</h4>
          <div>
            {answer.what_to_check.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      )}
      <div className="cp-citations">
        <h4>
          SOURCES <span>{answer.sources.length}</span>
        </h4>
        {answer.sources.map((s, i) => (
          <button key={s.id} onClick={() => onSource(s)}>
            <span className="cp-citation-number">{i + 1}</span>
            <span>
              {s.title}
              <small>
                {s.section} · Updated {dateKey(s.updated)}
              </small>
            </span>
            <ArrowUpRight size={13} />
          </button>
        ))}
        {!answer.sources.length && (
          <small>No supporting approved source found.</small>
        )}
      </div>
      {expanded && (
        <div className="cp-expanded-answer">
          <p>
            Evidence level reflects retrieval and source validation, not a
            calibrated probability of correctness.
          </p>
          <small>
            Generated in {(answer.latency_ms / 1000).toFixed(2)}s
            {answer.cached ? ' · Cached answer' : ''} · {answer.language}
          </small>
          {answer.sources.map((s) => (
            <blockquote key={s.id}>{s.excerpt.slice(0, 500)}</blockquote>
          ))}
        </div>
      )}
      <div className="cp-answer-actions">
        <Button disabled={readonly} onClick={() => feedback(answer, 'Helpful')}>
          <Check size={14} />
          {answer.feedback === 'Helpful' ? 'Answer used' : 'Use answer'}
        </Button>
        <Button variant="outline" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Less' : 'Expand'}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </Button>
        <button
          className="cp-icon-btn"
          title="Needs verification"
          aria-label="Mark answer as needing verification"
          disabled={readonly}
          onClick={() => feedback(answer, 'Needs Verification')}
        >
          <ShieldCheck size={16} />
        </button>
        <button
          className="cp-icon-btn"
          title="Not helpful"
          aria-label="Mark answer not helpful"
          disabled={readonly}
          onClick={() => feedback(answer, 'Not Helpful')}
        >
          <ThumbsDown size={15} />
        </button>
        <button
          className="cp-icon-btn"
          title="Incorrect"
          aria-label="Mark answer incorrect"
          disabled={readonly}
          onClick={() => feedback(answer, 'Incorrect')}
        >
          <X size={16} />
        </button>
      </div>
      {answer.feedback && (
        <small className="cp-feedback-saved">
          <Check size={11} /> Feedback: {answer.feedback}
        </small>
      )}
    </article>
  );
}
