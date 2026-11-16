"""Original background music for the promo: a calm amapiano-style groove (soft pad, log-drum bass,
shaker and light keys) at 112 BPM. Generated from scratch with numpy, so it is free to use with no
licence or copyright claim. The promo plays it quietly and dips it further under speech.

Usage: python3 tools/music.py public/audio/music.wav [seconds]
"""
import sys
import wave

import numpy as np

SR = 44100
out_path = sys.argv[1]
duration = float(sys.argv[2]) if len(sys.argv) > 2 else 45.0
n = int(SR * duration)
t_all = np.arange(n) / SR
rng = np.random.default_rng(11)
bpm = 112
beat = 60 / bpm
bar = 4 * beat
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [50, 53, 57, 60, 64], [52, 56, 59, 62, 64]]  # Am9 Fmaj9 Dm9 E7
roots = [33, 29, 26, 28]


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain


pad = np.zeros(n)
for b in range(int(duration / bar) + 1):
    st = b * bar
    ln = min(bar + 0.4, duration - st)
    if ln <= 0:
        break
    tt = np.arange(int(ln * SR)) / SR
    sig = sum(np.sin(2 * np.pi * hz(m) * (1 + d) * tt) for m in chords[b % 4] for d in (-0.0012, 0.0012))
    env = np.minimum(1, tt / 0.6) * np.minimum(1, (ln - tt) / 0.4)
    add(pad, st, sig * env)
pad = lowpass(pad / np.max(np.abs(pad)), 1400)

# Log-drum bass: pitched, gliding hits on a syncopated pattern
logd = np.zeros(n)
pattern = [0, 1.5, 2.75, 3.5]
for b in range(int(duration / bar) + 1):
    for p in pattern:
        st = b * bar + p * beat
        if 3.0 <= st < duration - 1.0:
            tt = np.arange(int(0.45 * SR)) / SR
            f0 = hz(roots[b % 4] + 12)
            f = f0 * (1 + 0.6 * np.exp(-tt / 0.025))
            add(logd, st, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.16) * np.minimum(1, tt / 0.004))

kick = np.zeros(n)
kt = np.arange(int(0.3 * SR)) / SR
ks = np.sin(2 * np.pi * (48 * kt + 70 * 0.05 * (1 - np.exp(-kt / 0.05)))) * np.exp(-kt / 0.09)
for i_b in range(int(duration / beat) + 1):
    st = i_b * beat
    if 3.0 <= st < duration - 1.0:
        add(kick, st, ks)

shaker = np.zeros(n)
for i_s in range(int(duration / (beat / 4)) + 1):
    st = i_s * beat / 4
    if 1.0 <= st < duration - 0.8:
        m = int(0.04 * SR)
        noise = np.diff(rng.standard_normal(m + 1))
        accent = 1.0 if i_s % 2 else 0.55
        add(shaker, st, noise * np.exp(-np.arange(m) / SR / 0.012) * accent)

keys = np.zeros(n)
for b in range(int(duration / bar) + 1):
    for k, p in enumerate((0.5, 1.5, 2.5, 3.25)):
        st = b * bar + p * beat
        if 6.0 <= st < duration - 2.0:
            tt = np.arange(int(0.5 * SR)) / SR
            m = chords[b % 4][(k + 1) % 5] + 12
            add(keys, st, (np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(4 * np.pi * hz(m) * tt)) * np.exp(-tt / 0.18))

mix = 0.32 * pad + 0.42 * logd + 0.35 * kick + 0.05 * shaker + 0.07 * keys
mix *= np.minimum(1, t_all / 1.0) * np.minimum(1, (duration - t_all) / 1.5)
stereo = np.stack([mix + 0.02 * np.roll(shaker, 180), mix + 0.02 * np.roll(keys, 260)], axis=1)
stereo /= np.max(np.abs(stereo)) / 0.85
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print(f'music: {duration:.0f}s -> {out_path}')
