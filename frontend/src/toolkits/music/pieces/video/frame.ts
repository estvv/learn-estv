import type { LyricLine, PieceNote } from '@learn/shared';
import type { Look } from '../../../../lib/appearance';
import { stage } from '../../stage/settings';
import type { NoteSource } from '../FallingNotes';
import { NotesPainter } from '../FallingNotes';
import { filled, sungAt, sungLines, type SungLine } from '../lyrics';
import type { VideoOptions } from './settings';

// One picture of a video: the notes falling, the keyboard, and over them the
// lyrics, the title and the logo. The same painter as on the screen.

type Ctx = CanvasRenderingContext2D;
const FONT = (weight: number, size: number) => `${weight} ${size}px "Plus Jakarta Sans", system-ui, sans-serif`;
// Seconds the title stays, then fades.
const TITLE = 3.5;
const FADE = 0.8;

export interface Film {
  player: NoteSource;
  from: number;
  to: number;
  title: string;
  artist: string | null;
  lyrics: LyricLine[] | null;
  numbers?: ReadonlyMap<PieceNote, number>;
  // From when the video starts (seconds in the piece).
  start: number;
}

export class FrameMaker {
  private painter: NotesPainter;
  private keys: HTMLCanvasElement;
  private sung: SungLine[];
  private logo: HTMLImageElement | null = null;

  constructor(private film: Film, private options: VideoOptions, private look: Look, private w: number, private h: number) {
    this.painter = new NotesPainter(film.from, film.to);
    this.keys = document.createElement('canvas');
    this.sung = film.lyrics ? sungLines(film.lyrics) : [];
    if (options.logoImage) {
      const img = new Image();
      img.src = options.logoImage;
      this.logo = img;
    }
  }

  // Where things go.
  private get layout() {
    const { w, h } = this;
    const portrait = this.options.format === 'portrait';
    const keysH = Math.round(portrait ? h * 0.13 : h * 0.2);
    return { notesH: h - keysH, keysH, unit: Math.min(w, h) / 1080 };
  }

  draw(ctx: Ctx, at: number) {
    const { w, h, film, options, look } = this;
    const { notesH, keysH, unit } = this.layout;
    const styled = stage.get().style !== 'classic';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = styled ? '#000000' : look.theme === 'dark' ? '#121212' : '#fafafa';
    ctx.fillRect(0, 0, w, h);

    if (this.keys.width !== w || this.keys.height !== keysH) Object.assign(this.keys, { width: w, height: keysH });
    const keyCtx = this.keys.getContext('2d');
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, notesH);
    ctx.clip();
    this.painter.paint(ctx, w, notesH, film.player, { numbers: options.numbers ? film.numbers : undefined, keys: styled ? keyCtx : null, keysSize: [w, keysH] }, at);
    ctx.restore();
    this.keyboard(ctx, notesH, keysH, styled);

    const pos = film.player.position;
    if (options.lyrics && this.sung.length) this.lyrics(ctx, pos, unit);
    if (options.title) this.titleCard(ctx, pos - film.start, unit);
    if (options.logo || this.logo) this.watermark(ctx, unit);
  }

  private keyboard(ctx: Ctx, y: number, kh: number, styled: boolean) {
    const { w, look } = this;
    const layout = this.painter.layout;
    const sounding = new Map<number, string>();
    for (const n of this.film.player.notes) {
      const pos = this.film.player.position;
      if (n.time > pos) break;
      if (n.time + n.duration > pos) sounding.set(n.midi, (n.hand === 'left' ? look.left : look.right).strong);
    }
    const blackH = kh * 0.62;
    for (const [m, b] of layout) {
      if (b.black) continue;
      ctx.fillStyle = !styled && sounding.has(m) ? sounding.get(m)! : '#f4f4f4';
      ctx.fillRect(b.x * w + 0.5, y, b.width * w - 1, kh);
    }
    if (styled) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.keys, 0, y);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const [m, b] of layout) {
      if (!b.black) continue;
      ctx.fillStyle = !styled && sounding.has(m) ? sounding.get(m)! : '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(b.x * w, y, b.width * w, blackH, [0, 0, 3, 3]);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, y, w, 2);
  }

  private lyrics(ctx: Ctx, pos: number, unit: number) {
    const now = sungAt(this.sung, pos);
    const line = this.sung[now];
    const next = this.sung[now + 1];
    const portrait = this.options.format === 'portrait';
    const y = portrait ? this.h * 0.36 : this.layout.notesH * 0.14;
    const big = 54 * unit;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Long lines get smaller rather than cut.
    const fit = (text: string, size: number, weight: number) => {
      ctx.font = FONT(weight, size);
      const width = ctx.measureText(text).width;
      const room = this.w * 0.9;
      if (width <= room) return { size, width };
      const smaller = (size * room) / width;
      ctx.font = FONT(weight, smaller);
      return { size: smaller, width: room };
    };
    if (line && line.words.length && pos < line.end + 1.5) {
      const text = line.words.map((x) => x.text).join(' ');
      const { width } = fit(text, big, 700);
      let x = (this.w - width) / 2;
      ctx.lineWidth = 8 * unit;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeText(text, x, y);
      for (const word of line.words) {
        const part = `${word.text} `;
        const ww = ctx.measureText(part).width;
        const share = filled(word, pos);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(word.text, x, y);
        if (share > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y - big, ctx.measureText(word.text).width * share, big * 2);
          ctx.clip();
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(word.text, x, y);
          ctx.restore();
        }
        x += ww;
      }
    }
    if (next && next.words.length) {
      const text = next.words.map((x) => x.text).join(' ');
      const { width } = fit(text, big * 0.6, 600);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 6 * unit;
      ctx.strokeText(text, (this.w - width) / 2, y + big * 1.1);
      ctx.fillText(text, (this.w - width) / 2, y + big * 1.1);
    }
  }

  private titleCard(ctx: Ctx, since: number, unit: number) {
    if (since > TITLE + FADE) return;
    const a = since < TITLE ? 1 : 1 - (since - TITLE) / FADE;
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = this.options.format === 'portrait' ? this.h * 0.2 : this.layout.notesH * 0.42;
    ctx.font = FONT(800, 88 * unit);
    ctx.lineWidth = 10 * unit;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(this.film.title, this.w / 2, y, this.w * 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.film.title, this.w / 2, y, this.w * 0.9);
    if (this.film.artist) {
      ctx.font = FONT(500, 44 * unit);
      ctx.strokeText(this.film.artist, this.w / 2, y + 80 * unit, this.w * 0.9);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(this.film.artist, this.w / 2, y + 80 * unit, this.w * 0.9);
    }
    ctx.globalAlpha = 1;
  }

  private watermark(ctx: Ctx, unit: number) {
    const pad = 36 * unit;
    let x = pad;
    const size = 64 * unit;
    ctx.globalAlpha = 0.7;
    if (this.logo?.complete && this.logo.naturalWidth) {
      const width = (this.logo.naturalWidth / this.logo.naturalHeight) * size;
      ctx.drawImage(this.logo, x, pad, width, size);
      x += width + 16 * unit;
    }
    if (this.options.logo) {
      ctx.font = FONT(800, 46 * unit);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 6 * unit;
      ctx.strokeText(this.options.logo, x, pad + size / 2);
      ctx.fillText(this.options.logo, x, pad + size / 2);
    }
    ctx.globalAlpha = 1;
  }
}
