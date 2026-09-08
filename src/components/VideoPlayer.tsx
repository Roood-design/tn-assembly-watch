import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { currentTime, seekTick } from '../stores/playback';

interface Props {
  youtubeId: string;
  startOffsetSeconds?: number;
}

// Minimal YT typings — we only touch these methods.
interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  playVideo?: () => void;
  destroy?: () => void;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, config: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoading: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise<void>(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return apiLoading;
}

const IS_PLACEHOLDER = (id: string) => id.startsWith('PLACEHOLDER');

export default function VideoPlayer({ youtubeId, startOffsetSeconds = 0 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const tick = useStore(seekTick);

  // Create the player once.
  useEffect(() => {
    if (IS_PLACEHOLDER(youtubeId) || !mountRef.current) return;
    let cancelled = false;
    let pollId: number | undefined;

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: youtubeId,
        playerVars: { start: startOffsetSeconds, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            // Push player time into the store every 500ms so timeline + transcript follow.
            pollId = window.setInterval(() => {
              const t = playerRef.current?.getCurrentTime();
              if (typeof t === 'number' && !Number.isNaN(t)) {
                currentTime.set(Math.floor(t));
              }
            }, 500);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (pollId !== undefined) window.clearInterval(pollId);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [youtubeId, startOffsetSeconds]);

  // React to seek requests.
  useEffect(() => {
    if (tick === 0) return;
    const t = currentTime.get();
    playerRef.current?.seekTo(t, true);
    playerRef.current?.playVideo?.();
  }, [tick]);

  if (IS_PLACEHOLDER(youtubeId)) {
    const now = useStore(currentTime);
    return (
      <div className="aspect-video w-full rounded-lg bg-slate-900 text-white flex flex-col items-center justify-center gap-2 border border-slate-800">
        <div className="text-xs uppercase tracking-widest text-slate-400">Demo Video Placeholder</div>
        <div className="text-3xl tabular-nums font-mono">
          {Math.floor(now / 3600)}:
          {String(Math.floor((now % 3600) / 60)).padStart(2, '0')}:
          {String(now % 60).padStart(2, '0')}
        </div>
        <div className="text-xs text-slate-500 max-w-md text-center px-4">
          When a real assembly YouTube ID is provided, this panel embeds the video and jumps
          to the timestamp you click on the timeline or in the transcript.
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
