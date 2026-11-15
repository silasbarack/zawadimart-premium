"""Generates the voice-over: one WAV per line in config.json "voice", with Kokoro, an open-source
neural text-to-speech model (Apache 2.0), then evens out and brightens it with ffmpeg for an advert sound.

Usage: python3 voice.py   (writes voice/<id>.wav at 44.1 kHz and voice/durations.json)
Needs: pip install kokoro-onnx soundfile, ffmpeg, and the two model files from
https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0: kokoro-v1.0.onnx and
voices-v1.0.bin) in the folder named by KOKORO_DIR (default: ./kokoro).
Lines are only regenerated when their text, voice or speed changes.
"""
import hashlib
import json
import os
import subprocess

import soundfile as sf
from kokoro_onnx import Kokoro

DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(DIR, 'voice')
cfg = json.load(open(os.path.join(DIR, 'config.json')))['voice']
model_dir = os.environ.get('KOKORO_DIR', os.path.join(DIR, 'kokoro'))
os.makedirs(OUT, exist_ok=True)
lang = 'en-gb' if cfg['voice'].startswith('b') else 'en-us'
# Light compression and a little presence so the voice sits clearly on top of the music
FILTER = 'highpass=f=70,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2,aresample=44100'

tts = None
durations = {}
for key, text in cfg['lines'].items():
    tag = hashlib.sha1(f"{cfg['voice']}|{cfg.get('speed', 1)}|{text}".encode()).hexdigest()[:12]
    wav, stamp = os.path.join(OUT, f'{key}.wav'), os.path.join(OUT, f'{key}.tag')
    if not (os.path.exists(wav) and os.path.exists(stamp) and open(stamp).read() == tag):
        if tts is None:
            tts = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
        samples, sr = tts.create(text, voice=cfg['voice'], speed=cfg.get('speed', 1.0), lang=lang)
        raw = os.path.join(OUT, f'{key}.raw.wav')
        sf.write(raw, samples, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', FILTER, '-ac', '1', wav], check=True)
        os.remove(raw)
        open(stamp, 'w').write(tag)
    info = sf.info(wav)
    durations[key] = round(info.frames / info.samplerate, 3)
    print(f'{key:6s} {durations[key]:5.2f}s  {text}')
json.dump(durations, open(os.path.join(OUT, 'durations.json'), 'w'), indent=1)
print(f'voice-over: {sum(durations.values()):.1f}s of speech in {len(durations)} lines')
