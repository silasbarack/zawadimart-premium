"""Generates the ad's soundtrack: an original, copyright-free electronic backing track plus
sound effects at the cue times the video reports (cues.json, written by render.cjs).

Usage: python3 soundtrack.py cues.json DURATION_SECONDS out.wav [VOICE_DIR]
With VOICE_DIR, the voice-over lines (VOICE_DIR/<id>.wav, 44.1 kHz) are placed at their 'vo' cues
and the music and effects are turned down underneath them.
Needs only numpy.
"""
import json
import sys
import wave

import numpy as np

SR = 44100
cues_path, duration, out_path = sys.argv[1], float(sys.argv[2]), sys.argv[3]
voice_dir = sys.argv[4] if len(sys.argv) > 4 else None
cues = json.load(open(cues_path))
# Section times come from the video: the beat starts after the hook, the arpeggio runs under the features
sec = {c['type']: c['t'] for c in cues if c['type'].startswith('music_')}
BEAT = sec.get('music_beat', 3.5)
ARP_ON, ARP_OFF = sec.get('music_arp_on', 9.5), sec.get('music_arp_off', 24.5)
n = int(SR * duration)
t_all = np.arange(n) / SR
rng = np.random.default_rng(7)

music = np.zeros((n, 2))
fx = np.zeros((n, 2))


def place(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= n:
        return
    sig = sig[: n - i]
    left, right = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    buf[i:i + len(sig), 0] += sig * gain * left * 1.41
    buf[i:i + len(sig), 1] += sig * gain * right * 1.41


def env(length, attack=0.005, decay=None):
    t = np.arange(int(length * SR)) / SR
    e = np.minimum(1, t / max(attack, 1e-4))
    if decay:
        e *= np.exp(-t / decay)
    return e


def onepole_lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# --- Music: 112 BPM, Am7 - Fmaj7 - Cmaj7 - G6 ---
bpm = 112
beat = 60 / bpm
bar = 4 * beat
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
roots = [45, 41, 48, 43]

# Warm pad: a few detuned harmonics per note, softened with a low-pass filter
pad = np.zeros(n)
for b in range(int(duration / bar) + 1):
    start = b * bar
    length = min(bar + 0.3, duration - start)
    if length <= 0:
        break
    tt = np.arange(int(length * SR)) / SR
    sig = np.zeros_like(tt)
    for m in chords[b % 4]:
        f = note_hz(m)
        for det in (-0.12, 0.12):
            for h, amp in ((1, 1), (2, 0.35), (3, 0.15)):
                sig += amp * np.sin(2 * np.pi * f * h * (1 + det / 100) * tt)
    e = np.minimum(1, tt / 0.35) * np.minimum(1, (length - tt) / 0.3)
    i = int(start * SR)
    pad[i:i + len(sig)] += sig * e
pad = onepole_lowpass(pad / np.max(np.abs(pad)), 1800)

# Kick on every beat from 3.5 s (after the hook) to just before the end; it also ducks the pad
kick = np.zeros(n)
duck = np.ones(n)
k_t = np.arange(int(0.32 * SR)) / SR
k_sig = np.sin(2 * np.pi * (45 * k_t + (120 - 45) * 0.06 * (1 - np.exp(-k_t / 0.06)))) * np.exp(-k_t / 0.11)
for i_b in range(int(duration / beat) + 1):
    s = i_b * beat
    if BEAT <= s < duration - 1.6:
        i = int(s * SR)
        seg = k_sig[: n - i]
        kick[i:i + len(seg)] += seg
        d = 1 - 0.55 * np.exp(-np.arange(int(0.3 * SR)) / SR / 0.12)
        duck[i:i + len(d[: n - i])] = np.minimum(duck[i:i + len(d[: n - i])], d[: n - i])

# Off-beat hi-hats (high-passed noise) from 3 s
hats = np.zeros(n)
h_len = int(0.05 * SR)
for i_b in range(int(duration / beat) + 1):
    s = i_b * beat + beat / 2
    if BEAT <= s < duration - 1.6:
        noise = rng.standard_normal(h_len)
        noise = np.diff(noise, prepend=0)
        i = int(s * SR)
        seg = (noise * np.exp(-np.arange(h_len) / SR / 0.012))[: n - i]
        hats[i:i + len(seg)] += seg

# Bass on beats 1 and 3
bass = np.zeros(n)
for b in range(int(duration / bar) + 1):
    for off in (0, 2):
        s = b * bar + off * beat
        if BEAT <= s < duration - 1.2:
            tt = np.arange(int(beat * 1.6 * SR)) / SR
            f = note_hz(roots[b % 4])
            sig = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt / 0.35) * np.minimum(1, tt / 0.01)
            i = int(s * SR)
            bass[i:i + len(sig[: n - i])] += sig[: n - i]

# Light pluck arpeggio on eighth notes during the features and pitch (9.5 s to 24.5 s)
arp = np.zeros(n)
for i_e in range(int(duration / (beat / 2)) + 1):
    s = i_e * beat / 2
    if ARP_ON <= s < ARP_OFF:
        b = int(s / bar)
        m = chords[b % 4][i_e % 4] + 12
        tt = np.arange(int(0.3 * SR)) / SR
        f = note_hz(m)
        sig = (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * f * tt)) * np.exp(-tt / 0.09)
        i = int(s * SR)
        arp[i:i + len(sig[: n - i])] += sig[: n - i]

mix = 0.34 * pad * duck + 0.9 * kick + 0.07 * hats + 0.32 * bass + 0.11 * arp
fade = np.minimum(1, t_all / 0.4) * np.minimum(1, (duration - t_all) / 1.4)
mix *= fade
music[:, 0] = mix
music[:, 1] = mix
# A touch of stereo width on hats and arp
music[:, 0] += 0.02 * np.roll(hats, 220)
music[:, 1] += 0.02 * np.roll(arp, 330)

# --- Sound effects ---
def whoosh(length=0.5, lo=300, hi=4000):
    m = int(length * SR)
    noise = rng.standard_normal(m)
    tt = np.arange(m) / SR
    sweep = lo * (hi / lo) ** (tt / length)
    y = np.zeros(m)
    acc = 0.0
    for i in range(m):
        a = np.exp(-2 * np.pi * sweep[i] / SR)
        acc = (1 - a) * noise[i] + a * acc
        y[i] = acc
    shape = np.sin(np.pi * tt / length) ** 2
    return y * shape / (np.max(np.abs(y)) + 1e-9)


def blip(f0, f1, length, decay):
    tt = np.arange(int(length * SR)) / SR
    f = f0 * (f1 / f0) ** (tt / length)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / decay) * np.minimum(1, tt / 0.003)


def chime():
    tt = np.arange(int(1.2 * SR)) / SR
    a = np.sin(2 * np.pi * 1318.5 * tt) * np.exp(-tt / 0.45)
    b = np.zeros_like(tt)
    k = int(0.09 * SR)
    b[k:] = np.sin(2 * np.pi * 1975.5 * tt[: len(tt) - k]) * np.exp(-tt[: len(tt) - k] / 0.5)
    return (a + 0.8 * b) * 0.6


def impact():
    tt = np.arange(int(0.9 * SR)) / SR
    boom = np.sin(2 * np.pi * (38 * tt + 70 * 0.08 * (1 - np.exp(-tt / 0.08)))) * np.exp(-tt / 0.3)
    hit = rng.standard_normal(len(tt)) * np.exp(-tt / 0.03) * 0.4
    return boom + hit


def riser(length):
    w = whoosh(length, 200, 6000)
    tt = np.arange(len(w)) / SR
    return w * (tt / length) ** 1.5


place(fx, max(0, BEAT - 2.0), riser(2.0), 0.22)
for c in cues:
    t0, kind = c['t'], c['type']
    if kind == 'whoosh':
        place(fx, max(0, t0 - 0.25), whoosh(0.55), 0.32)
    elif kind == 'swish':
        place(fx, max(0, t0 - 0.12), whoosh(0.32, 800, 6000), 0.2, pan=0.3)
    elif kind == 'pop':
        place(fx, t0, blip(900, 380, 0.12, 0.04), 0.35)
    elif kind == 'tick':
        place(fx, t0, blip(1800, 1500, 0.06, 0.015), 0.22, pan=-0.2)
    elif kind == 'impact':
        place(fx, t0, impact(), 0.5)
    elif kind == 'chime':
        place(fx, t0, chime(), 0.45)
    elif kind == 'click':
        click = rng.standard_normal(int(0.02 * SR)) * np.exp(-np.arange(int(0.02 * SR)) / SR / 0.004)
        place(fx, t0, click, 0.35)
    elif kind == 'tap':
        place(fx, t0, blip(520, 300, 0.09, 0.025), 0.3, pan=0.15)
    elif kind == 'key':
        k = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR / 0.002)
        place(fx, t0, k, 0.16)
    elif kind == 'scroll':
        place(fx, t0, whoosh(0.5, 400, 1600), 0.07, pan=-0.1)
    elif kind == 'swipe':
        place(fx, max(0, t0 - 0.05), whoosh(0.3, 1000, 5000), 0.12, pan=0.2)

# --- Voice-over, with the music ducked underneath ---
vo = np.zeros(n)
if voice_dir:
    for c in cues:
        if c['type'] != 'vo':
            continue
        with wave.open(f"{voice_dir}/{c['id']}.wav") as w:
            assert w.getframerate() == SR and w.getsampwidth() == 2
            sig = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
            if w.getnchannels() == 2:
                sig = sig.reshape(-1, 2).mean(axis=1)
        i = int(c['t'] * SR)
        sig = sig[: max(0, n - i)]
        vo[i:i + len(sig)] += sig
    peak = np.max(np.abs(vo))
    if peak > 0:
        vo /= peak
    # Smoothed speech envelope -> gain that dips the backing to about 35% while he talks
    env_vo = np.convolve(np.abs(vo), np.ones(int(0.25 * SR)) / int(0.25 * SR), mode='same')
    env_vo = np.minimum(1, env_vo / (np.max(env_vo) * 0.25 + 1e-9))
    duck_vo = 1 - 0.65 * env_vo
    music *= duck_vo[:, None]
    fx *= (1 - 0.4 * env_vo)[:, None]

out = music * 0.75 + fx
out[:, 0] += 0.95 * vo
out[:, 1] += 0.95 * vo
out /= max(1e-9, np.max(np.abs(out))) / 0.9
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print(f'soundtrack: {duration:.1f}s, {sum(c["type"] == "vo" for c in cues)} voice lines, {len(cues)} cues -> {out_path}')
