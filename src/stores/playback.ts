import { atom } from 'nanostores';

// Current playback time in seconds within the sitting video.
// TimelineRibbon & TranscriptViewer write to this; VideoPlayer subscribes and calls seekTo.
export const currentTime = atom<number>(0);

// A monotonically increasing counter that lets the VideoPlayer distinguish
// a real "seek requested" event from ordinary progress updates.
// Without this, setting currentTime = 120 while the video is already at 120 wouldn't
// re-trigger a seek, and clicking the same segment twice would silently no-op.
export const seekTick = atom<number>(0);

export function requestSeek(seconds: number) {
  currentTime.set(Math.max(0, Math.floor(seconds)));
  seekTick.set(seekTick.get() + 1);
}
