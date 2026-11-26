import { soundStream } from '../../audio';
import type { PiecePlayer } from '../player';
import type { FrameMaker } from './frame';

// The video is filmed as the piece plays: drawn, heard and recorded at once.

const TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const canFilm = () => typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
export const fileType = () => TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

export interface Filming {
  stop(): void;
  // The video, once the end is reached or it is stopped. Null: stopped before the end.
  done: Promise<Blob | null>;
}

// What is heard is played a little ahead of time: the pictures wait for it.
export function heardAs<T extends { position: number }>(player: T, late: number): T {
  return new Proxy(player, { get: (p, key) => (key === 'position' ? Math.max(0, p.position - late) : Reflect.get(p, key, p)) });
}

export function film(player: PiecePlayer, maker: FrameMaker, size: [number, number], { end, sound, onProgress }: { end: number; sound: boolean; onProgress(position: number): void }): Filming {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  const ctx = canvas.getContext('2d')!;
  maker.draw(ctx, performance.now());
  const video = canvas.captureStream(60);
  const audio = sound ? soundStream() : null;
  const stream = new MediaStream([...video.getVideoTracks(), ...(audio?.stream.getAudioTracks() ?? [])]);
  const mimeType = fileType();
  const pixels = size[0] * size[1];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: pixels > 1_500_000 ? 14_000_000 : 7_000_000, audioBitsPerSecond: 192_000 });
  const pieces: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && pieces.push(e.data);
  let finished = false;
  let raf = 0;
  const done = new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      audio?.stop();
      for (const t of stream.getTracks()) t.stop();
      resolve(finished && pieces.length ? new Blob(pieces, { type: recorder.mimeType || mimeType }) : null);
    };
  });
  const end_ = () => {
    if (recorder.state !== 'inactive') recorder.stop();
    player.pause();
  };
  const frame = () => {
    maker.draw(ctx, performance.now());
    onProgress(player.position);
    if (player.position >= end || player.state.get().finished) {
      finished = true;
      // The last notes ring a little.
      setTimeout(end_, 600);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  recorder.start(1000);
  void player.play();
  raf = requestAnimationFrame(frame);
  return { stop: end_, done };
}
