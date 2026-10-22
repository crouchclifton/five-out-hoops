"""Builds the four sound effects in sfx/ as small WAV files. Run: python3 tools/make-sfx.py"""
import math, os, struct, wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "sfx")


def notes(parts):
    """parts: list of (start_sec, freq, dur_sec, wave, volume)."""
    end = max(s + d for s, _, d, _, _ in parts)
    buf = [0.0] * int(end * RATE + RATE * 0.02)
    for start, f, dur, kind, vol in parts:
        n0 = int(start * RATE)
        for i in range(int(dur * RATE)):
            t = i / RATE
            ph = (f * t) % 1
            v = {"sine": math.sin(2 * math.pi * ph),
                 "square": 1.0 if ph < .5 else -1.0,
                 "triangle": 4 * abs(ph - .5) - 1}[kind]
            env = min(1, i / (RATE * .005)) * math.exp(-4 * t / dur)  # quick attack, fade out
            buf[n0 + i] += v * vol * env
    return buf


def write(name, buf):
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x)) * 32000)) for x in buf))


os.makedirs(OUT, exist_ok=True)
write("good", notes([(0, 660, .12, "sine", .5), (.1, 880, .2, "sine", .5)]))
write("bad", notes([(0, 200, .28, "square", .18)]))
write("pass", notes([(0, 420, .1, "triangle", .5)]))
write("swish", notes([(0, 523, .12, "sine", .45), (.08, 659, .12, "sine", .45), (.16, 784, .12, "sine", .45), (.24, 1047, .3, "sine", .45)]))
