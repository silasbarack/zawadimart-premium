import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import './styles.css';
import footageStatus from './footage-status.json';
import { AUDIO, CONTACT, CTA, DISCLOSURE, footageReady, FPS, INSERTS, MORE_SERVICES, SERVICES, SHOTS, SUBS, type Insert, type Shot } from './script';

const s = (sec: number) => Math.round(sec * FPS);
const audioReady = (file: string) => Boolean((footageStatus as Record<string, boolean>)[file]);
const PAIRS = [['#2563eb', '#7c3aed'], ['#db2777', '#ea580c'], ['#0891b2', '#059669'], ['#dc2626', '#d97706'], ['#7c3aed', '#db2777'], ['#0284c7', '#4f46e5']];
const grad = (i: number) => `linear-gradient(90deg,${PAIRS[i % 6][0]},${PAIRS[i % 6][1]})`;
const ease = Easing.bezier(0.22, 0.8, 0.25, 1);

// ---------- Building blocks ----------
const Phone: React.FC<{ w: number; x: number; y: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w, x, y, style, children }) => (
  <div className="phone" style={{ ['--w' as string]: `${w}px`, left: x, top: y, ...style }}><div className="screen">{children}</div></div>
);
const Monitor: React.FC<{ w: number; x: number; y: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w, x, y, style, children }) => (
  <div className="monitor" style={{ ['--w' as string]: `${w}px`, width: w, left: x, top: y, ...style }}><div className="bezel"><div className="screen">{children}</div></div><div className="stand" /><div className="foot" /></div>
);
const Clip: React.FC<{ src: string; startAt: number }> = ({ src, startAt }) => <OffthreadVideo src={staticFile(src)} startFrom={s(startAt)} muted style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;

const useIn = (delay = 0, dur = 0.6) => { const f = useCurrentFrame(); return interpolate(f, [s(delay), s(delay + dur)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }); };

// A live-action slot: the produced clip if it exists, otherwise a clearly labelled placeholder card
const LiveShot: React.FC<{ shot: Shot }> = ({ shot }) => {
  if (footageReady(shot.id)) return <AbsoluteFill><OffthreadVideo src={staticFile(`footage/${shot.id}.mp4`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></AbsoluteFill>;
  return (
    <div className="ph"><div className="box">
      <div className="id">LIVE-ACTION SHOT {shot.id.toUpperCase()} · PLACEHOLDER</div>
      <div className="who">{shot.who}</div>
      <div className="row"><b>Framing:</b> {shot.frame}</div>
      <div className="row"><b>Action:</b> {shot.action}</div>
      {shot.line ? <div className="row"><b>Says:</b> “{shot.line}”</div> : null}
      <div className="file">public/footage/{shot.id}.mp4</div>
    </div></div>
  );
};

// A genuine screen recording shown on a device, with a slow push-in
const ScreenInsert: React.FC<{ ins: Insert }> = ({ ins }) => {
  const f = useCurrentFrame(); const len = s(ins.to - ins.from);
  const push = interpolate(f, [0, len], [1, 1.05]); const appear = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1200px 1400px at 50% 40%, #fff7ed, #e7e5e4)' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, opacity: appear }}>
        {ins.kind === 'phone' ? <Phone w={480} x={260} y={235}><Clip src={ins.clip} startAt={ins.startAt} /></Phone> : null}
        {ins.kind === 'both' ? <>
          <Monitor w={880} x={60} y={260}><Clip src={ins.clip} startAt={ins.startAt} /></Monitor>
          <Phone w={300} x={600} y={720}><Clip src={ins.second!.clip} startAt={ins.second!.startAt} /></Phone>
        </> : null}
      </div>
      {ins.label ? <div className="demo" style={{ left: 280, top: 250 }}>{ins.label}</div> : null}
    </AbsoluteFill>
  );
};

const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const sub = SUBS.find((x) => f >= s(x.from) && f < s(x.to)); if (!sub) return null;
  const o = interpolate(f, [s(sub.from), s(sub.from) + 5, s(sub.to) - 5, s(sub.to)], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div className="sub" style={{ opacity: o }}><span className="t">{sub.text}</span><div className="en">{sub.en}</div></div>;
};

// ---------- Scene 4: services ----------
const Services: React.FC = () => {
  const f = useCurrentFrame(); const t = f / FPS; // 0..10 within the scene
  const head = useIn(0, 0.6);
  const panel = (a: number, b: number) => interpolate(t, [a, a + 0.5, b - 0.4, b], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pA = panel(0.5, 3.3), pB = panel(3.2, 6.0), pC = interpolate(t, [5.9, 6.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <div className="center" style={{ top: 160, opacity: head, transform: `translateY(${(1 - head) * -30}px)` }}><span className="kicker">Website development services</span></div>
      <div style={{ opacity: pA, transform: `translateY(${(1 - pA) * 60}px)` }}>
        {SERVICES.slice(0, 2).map((sv, i) => <React.Fragment key={sv.title}>
          <div className="center" style={{ top: 270, left: 50 + i * 440, right: 'auto', width: 440 }}><div className="g" style={{ backgroundImage: grad(i), fontSize: 38, fontWeight: 900, lineHeight: 1.1 }}>{sv.title}</div></div>
          <Phone w={380} x={80 + i * 440} y={400}><Clip src={sv.clip!} startAt={sv.startAt!} /></Phone>
          {sv.note ? <div className="demo" style={{ left: 110 + i * 440, top: 478 }}>{sv.note}</div> : null}
        </React.Fragment>)}
      </div>
      <div style={{ opacity: pB, transform: `translateY(${(1 - pB) * 60}px)` }}>
        <div className="center" style={{ top: 270 }}><div className="g" style={{ backgroundImage: grad(2), fontSize: 46, fontWeight: 900 }}>{SERVICES[2].title}</div></div>
        <Monitor w={880} x={60} y={360}><Clip src={SERVICES[2].clip!} startAt={SERVICES[2].startAt!} /></Monitor>
        <Phone w={250} x={680} y={720}><Clip src={SERVICES[3].clip!} startAt={SERVICES[3].startAt!} /></Phone>
        <div className="label" style={{ left: 80, top: 1000 }}>{SERVICES[3].title} →</div>
      </div>
      <div style={{ opacity: pC }}>
        <div className="center" style={{ top: 280 }}><div className="g" style={{ backgroundImage: grad(4), fontSize: 60, fontWeight: 900, lineHeight: 1.1 }}>Modern · Fast · Secure · Mobile-friendly</div></div>
        <div className="center" style={{ top: 470 }}>{[...SERVICES.map((x) => x.title), ...MORE_SERVICES].map((x, i) => {
          const o = interpolate(t, [6.2 + i * 0.18, 6.5 + i * 0.18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const c = [['#eff6ff', '#1d4ed8', '#bfdbfe'], ['#fdf2f8', '#be185d', '#fbcfe8'], ['#ecfdf5', '#047857', '#a7f3d0'], ['#fff7ed', '#c2410c', '#fed7aa']][i % 4];
          return <span key={x} className="chip" style={{ opacity: o, transform: `scale(${0.8 + 0.2 * o})`, background: c[0], color: c[1], borderColor: c[2] }}>{x}</span>;
        })}</div>
        <div className="center" style={{ top: 1060, fontSize: 30, color: '#64748b' }}>Live project shown: ZawadiMart (e-commerce). Ask on WhatsApp for examples of other website types.</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 5: WhatsApp call to action ----------
const ICON: Record<string, string> = {
  back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
  video: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11z',
  call: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z',
  send: 'M2 21l21-9L2 3v7l15 2-15 2z',
};
const Icon: React.FC<{ n: string; fill?: string; size?: number }> = ({ n, fill = '#e9edef', size = 24 }) => <svg viewBox="0 0 24 24" width={size} height={size} style={{ flex: 'none' }}><path d={ICON[n]} fill={fill} /></svg>;

const Chat: React.FC<{ scale: number }> = ({ scale }) => {
  const f = useCurrentFrame(); const t = f / FPS; // seconds into scene 5
  const typeFrom = 1.2, per = 0.045; const n = Math.max(0, Math.min(CTA.message.length, Math.floor((t - typeFrom) / per)));
  const kb = interpolate(t, [0.7, 1.05], [262, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const done = n >= CTA.message.length; const pulse = done ? 1 + 0.08 * Math.sin((t - typeFrom - CTA.message.length * per) * 6) : 1;
  const lines = Math.ceil(Math.max(1, n) / 34); const barH = 48 + (lines - 1) * 21;
  const typed = CTA.message.slice(0, n); const lastKey = typed.slice(-1).toLowerCase();
  const keys = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  return (
    <div className="chat" style={{ transform: `scale(${scale})` }}><div className="wall" />
      <div className="sb"><span>{CTA.chatTime}</span><span>▮▮▮ ▭</span></div>
      <div className="hd"><Icon n="back" /><Img className="av" src={staticFile('assets/avatar.jpg')} /><div style={{ flex: 1, marginLeft: 4 }}><div className="nm">{CONTACT.whatsapp}</div><div className="st">online</div></div><Icon n="video" /><span style={{ width: 14 }} /><Icon n="call" /></div>
      <div className="pill" style={{ top: 104, padding: '5px 12px', color: '#8696a0' }}>Today</div>
      <div className="pill" style={{ top: 140, width: 330, padding: '8px 12px', color: '#ffd279', lineHeight: '17px' }}>Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.</div>
      <div className="bar" style={{ bottom: 10 + 262 - kb, height: barH }}>
        <div className="txt">{n ? typed : <span style={{ color: '#8696a0' }}>Message</span>}{n && !done ? <span style={{ display: 'inline-block', width: 2, height: 19, marginLeft: 1, verticalAlign: -3, background: '#00a884' }} /> : null}</div>
      </div>
      <div className="fab" style={{ bottom: 10 + 262 - kb, transform: `scale(${pulse})` }}><div style={{ position: 'absolute', left: 12, top: 12 }}><Icon n="send" fill="#0b141a" /></div></div>
      <div className="kb" style={{ transform: `translateY(${kb}px)` }}>
        <div className="sug"><span>Hello</span><span>|</span><span>I</span><span>|</span><span>Hi</span></div>
        {keys.map((row, ri) => <div className="row" key={row}>{ri === 2 ? <div className="k w">⇧</div> : null}{[...row].map((c) => <div className="k" key={c} style={{ background: !done && n && c === lastKey ? '#8ab4f8' : undefined, color: !done && n && c === lastKey ? '#202124' : undefined }}>{c}</div>)}{ri === 2 ? <div className="k w">⌫</div> : null}</div>)}
        <div className="row"><div className="k w">?123</div><div className="k">,</div><div className="k sp" style={{ background: !done && lastKey === ' ' ? '#8ab4f8' : undefined }} /><div className="k">.</div><div className="k w" style={{ background: '#8ab4f8', color: '#202124' }}>↵</div></div>
        <div className="gb" />
      </div>
    </div>
  );
};

const CallToAction: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const t = f / fps;
  const head = useIn(0.1, 0.6); const contact = useIn(2.4, 0.6); const btn = useIn(3.0, 0.6);
  const swing = spring({ frame: f - 4, fps, config: { damping: 14, stiffness: 60 } });
  const rotY = interpolate(swing, [0, 1], [32, -8]) + Math.sin(t * 1.2) * 2; const rise = interpolate(swing, [0, 1], [260, 0]);
  const PW = 380;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(1200px 1000px at 50% 40%, #f0fdf4, #fff 70%)' }}>
      <div className="center" style={{ top: 150, opacity: head, transform: `translateY(${(1 - head) * -30}px)` }}>
        <div className="g" style={{ backgroundImage: 'linear-gradient(90deg,#0f766e,#2563eb,#7c3aed)', fontSize: 70, fontWeight: 900, letterSpacing: -1, lineHeight: 1.05 }}>{CTA.headline}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, perspective: 1600 }}>
        <Phone w={PW} x={310} y={340} style={{ transform: `translateY(${rise}px) rotateY(${rotY}deg) rotateX(4deg)`, boxShadow: '0 0 0 3px #cbd5e1, 30px 60px 90px rgba(15,23,42,.35)' }}><Chat scale={(PW * 0.934) / 411} /></Phone>
      </div>
      <div className="center" style={{ top: 1135, opacity: contact, transform: `translateY(${(1 - contact) * 30}px)` }}>
        <div className="wa-row"><Img src={staticFile('assets/whatsapp.svg')} style={{ width: 58, height: 58 }} /><small>WHATSAPP:</small>{CONTACT.whatsapp}</div>
        <div className="wa-row" style={{ marginTop: 14, fontSize: 38 }}><small style={{ color: '#1d4ed8' }}>PORTFOLIO:</small><span className="g" style={{ backgroundImage: grad(5) }}>{CONTACT.portfolio}</span></div>
      </div>
      <div className="center" style={{ top: 1320, opacity: btn, transform: `scale(${0.85 + 0.15 * btn})` }}>
        <span className="btn"><Img src={staticFile('assets/whatsapp.svg')} style={{ width: 52, height: 52, filter: 'brightness(0) saturate(100%) invert(12%) sepia(40%) saturate(1800%) hue-rotate(110deg)' }} />{CTA.button}</span>
        <div style={{ marginTop: 18, fontSize: 30, fontWeight: 700, color: '#475569' }}>{CONTACT.waLink}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- The promo ----------
export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  // Music sits low and dips further under dialogue and the voice-over
  const musicVol = (fr: number) => { const t = fr / FPS; const talk = SUBS.some((x) => t > x.from - 0.2 && t < x.to + 0.2); return interpolate(fr, [0, 15, s(44), s(45)], [0, 1, 1, 0], { extrapolateRight: 'clamp' }) * (talk ? 0.12 : 0.3); };
  return (
    <AbsoluteFill className="root">
      {/* Scenes 1–3: live-action shots intercut with real screen recordings */}
      {SHOTS.map((sh) => <Sequence key={sh.id} from={s(sh.from)} durationInFrames={s(sh.to) - s(sh.from)}><LiveShot shot={sh} /></Sequence>)}
      {INSERTS.map((ins, i) => <Sequence key={i} from={s(ins.from)} durationInFrames={s(ins.to) - s(ins.from)}><ScreenInsert ins={ins} /></Sequence>)}
      <Sequence from={s(10.2)} durationInFrames={s(4.5)}><NameCard /></Sequence>
      <Sequence from={0} durationInFrames={s(25)}><div className="disclosure">{DISCLOSURE}</div></Sequence>
      {/* Scene 4 and 5 */}
      <Sequence from={s(25)} durationInFrames={s(10)}><Services /></Sequence>
      <Sequence from={s(35)} durationInFrames={s(10)}><CallToAction /></Sequence>
      <Subtitles />
      {audioReady(AUDIO.music) ? <Audio src={staticFile(AUDIO.music)} volume={musicVol} /> : null}
      {audioReady(AUDIO.voiceover) ? <Sequence from={s(25.3)}><Audio src={staticFile(AUDIO.voiceover)} /></Sequence> : null}
      {f < 0 ? null : null}
    </AbsoluteFill>
  );
};

// Shown when Barack's name is spoken in scene 2
const NameCard: React.FC = () => {
  const o = useIn(0, 0.4); const f = useCurrentFrame(); const out = interpolate(f, [s(4.1), s(4.5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 50, top: 1110, opacity: o * out, transform: `translateX(${(1 - o) * -60}px)`, display: 'flex', alignItems: 'center', gap: 18, padding: '16px 24px', borderRadius: 18, background: '#fff', boxShadow: '0 16px 40px rgba(15,23,42,.25)' }}>
      <Img src={staticFile('assets/whatsapp.svg')} style={{ width: 56, height: 56 }} />
      <div><div style={{ fontSize: 36, fontWeight: 900 }}>{CONTACT.name}</div><div style={{ fontSize: 28, fontWeight: 700, color: '#128c4a' }}>Website developer · {CONTACT.whatsapp}</div></div>
    </div>
  );
};
