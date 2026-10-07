"""Prepare a sparse garden soundscape preview using a licensed stream recording."""

from pathlib import Path
import io
import json
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "audio"
SOURCES = OUT / "sources"
SOURCES.mkdir(parents=True, exist_ok=True)

URL = "https://opengameart.org/sites/default/files/stream-waterfall.zip"
ARCHIVE = SOURCES / "stream-waterfall.zip"
if not ARCHIVE.exists():
    request = urllib.request.Request(URL, headers={"User-Agent": "CodeSentry audio preview"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(12 * 1024 * 1024 + 1)
    if len(data) > 12 * 1024 * 1024:
        raise ValueError("Source exceeds the download size limit")
    ARCHIVE.write_bytes(data)

sys.path.insert(0, str(ROOT / "tools" / ".audio-deps"))
import numpy as np
import soundfile as sf

RATE = 22050
DURATION = 60
SIZE = RATE * DURATION
RNG = np.random.default_rng(20261005)

with zipfile.ZipFile(ARCHIVE) as archive:
    stream, source_rate = sf.read(io.BytesIO(archive.read("stream-waterfall/stream1.ogg")),
                                 dtype="float32", always_2d=True)

if len(stream) < source_rate * 5:
    raise ValueError("Stream recording is too short")
if stream.shape[1] == 1:
    stream = np.repeat(stream, 2, axis=1)
stream = stream[:, :2]

# Preserve the recording's stereo texture; avoid waterfall samples in the pack.
source_times = np.arange(len(stream)) / source_rate
target_times = np.arange(int(len(stream) * RATE / source_rate)) / RATE
stream = np.column_stack([np.interp(target_times, source_times, stream[:, channel])
                          for channel in range(2)])
stream -= np.mean(stream, axis=0)

def soften(signal, cutoff):
    frequencies = np.fft.rfftfreq(len(signal), 1 / RATE)
    shape = 1 / np.sqrt(1 + (frequencies / cutoff) ** 6)
    return np.fft.irfft(np.fft.rfft(signal, axis=0) * shape[:, None],
                        n=len(signal), axis=0)

stream = soften(stream, 2300)
stream *= 0.050 / max(float(np.sqrt(np.mean(stream ** 2))), 1e-8)

# Crossfade repeats rather than create a sudden cut at the source boundary.
water = stream.copy()
overlap = min(3 * RATE, len(stream) // 4)
blend = np.linspace(0, 1, overlap)[:, None]
while len(water) < SIZE:
    join = water[-overlap:] * (1 - blend) + stream[:overlap] * blend
    water = np.concatenate([water[:-overlap], join, stream[overlap:]])
water = water[:SIZE]

# A faint, slowly varying breeze, made here rather than sampled from a song.
t = np.arange(SIZE) / RATE
frequencies = np.fft.rfftfreq(SIZE, 1 / RATE)
wind_shape = 1 / np.sqrt(np.maximum(frequencies, 30))
wind_shape *= (1 - np.exp(-(frequencies / 45) ** 2))
wind_shape /= np.sqrt(1 + (frequencies / 650) ** 6)
wind = np.fft.irfft(np.fft.rfft(RNG.normal(size=(SIZE, 2)), axis=0)
                   * wind_shape[:, None], n=SIZE, axis=0)
wind *= 0.007 / max(float(np.sqrt(np.mean(wind ** 2))), 1e-8)
wind *= (0.85 + 0.08 * np.sin(2 * np.pi * t / 37)
         + 0.07 * np.sin(2 * np.pi * t / 53))[:, None]

# Only three individual notes over one minute: no arpeggio, pulse or backing.
notes = np.zeros((SIZE, 2))
for start, frequency, pan in [(12, 146.83, -0.25), (32, 196.00, 0.20), (52, 220.00, -0.10)]:
    nt = np.arange(7 * RATE) / RATE
    tone = np.zeros_like(nt)
    for harmonic, weight, decay in [(1, 1.0, 2.5), (2, 0.18, 1.4), (3, 0.055, 0.8)]:
        tone += weight * np.sin(2 * np.pi * frequency * harmonic * nt) * np.exp(-nt / decay)
    tone *= 1 - np.exp(-nt / 0.045)
    tone[-RATE:] *= np.linspace(1, 0, RATE)
    tone *= 0.020 / max(float(np.max(np.abs(tone))), 1e-8)
    index = start * RATE
    gains = np.sqrt(np.array([(1 - pan) / 2, (1 + pan) / 2]))
    notes[index:index + len(tone)] += tone[:, None] * gains

mix = water + wind + notes
# Make a seamless loop for the web before adding the preview's entry/exit fades.
web = ROOT / "public" / "media" / "audio"
web.mkdir(parents=True, exist_ok=True)
cross = 3 * RATE
phase = np.linspace(0, 1, cross)[:, None]
join = mix[-cross:] * (1 - phase) + mix[:cross] * phase
loop = np.concatenate([join, mix[cross:-cross]])
sf.write(web / "garden.wav", loop, RATE, subtype="PCM_16")
with sf.SoundFile(web / "garden.ogg", "w", samplerate=RATE, channels=2,
                  format="OGG", subtype="VORBIS") as encoder:
    for begin in range(0, len(loop), 8192):
        encoder.write(loop[begin:begin + 8192].astype("float32"))
mix[:3 * RATE] *= np.sin(np.linspace(0, np.pi / 2, 3 * RATE))[:, None] ** 2
mix[-5 * RATE:] *= np.cos(np.linspace(0, np.pi / 2, 5 * RATE))[:, None] ** 2
peak = float(np.max(np.abs(mix)))
if peak > 0.90:
    mix *= 0.90 / peak

DESTINATION = OUT / "jardin-calmo-preview.wav"
sf.write(DESTINATION, mix, RATE, subtype="PCM_16")
report = {
    "path": str(DESTINATION),
    "duration_seconds": DURATION,
    "sample_rate": RATE,
    "musical_note_seconds": [12, 32, 52],
    "water_source": "kurt / Stream Sounds / stream1.ogg / CC BY 3.0",
    "wind": "original synthesis",
    "notes": "original synthesis",
    "peak_dbfs": round(20 * np.log10(max(float(np.max(np.abs(mix))), 1e-8)), 2),
    "rms_dbfs": round(20 * np.log10(max(float(np.sqrt(np.mean(mix ** 2))), 1e-8)), 2),
}
(OUT / "preview-info.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
