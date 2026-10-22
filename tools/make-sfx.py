"""Builds the sound effects in sfx/ as small WAV files. Run: python3 tools/make-sfx.py"""
import math, os, random, struct, wave

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


def tear(dur, crackle, bright):
    """Paper tearing: noise in tiny bursts. crackle = bursts per second, bright = how thin it sounds."""
    rnd = random.Random(5)
    buf, last, burst = [], 0.0, 0.0
    for i in range(int(dur * RATE)):
        t = i / RATE
        if rnd.random() < crackle / RATE:
            burst = .6 + rnd.random() * .4
        burst *= .9985
        n = rnd.uniform(-1, 1)
        hp = n - last * bright  # thin out the low end so it sounds like paper, not wind
        last = n
        env = min(1, t / .01) * (1 - t / dur) ** .6
        buf.append(hp * burst * env * .5)
    return buf


def zipper(dur, teeth):
    """A zipper: quick clicks that speed up."""
    buf = [0.0] * int(dur * RATE)
    for k in range(teeth):
        start = int(dur * RATE * (k / teeth) ** .8)
        for i in range(int(RATE * .006)):
            if start + i < len(buf):
                buf[start + i] += math.sin(2 * math.pi * (1800 + 30 * k) * i / RATE) * .35 * (1 - i / (RATE * .006))
    return buf


def write(name, buf):
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x)) * 32000)) for x in buf))


os.makedirs(OUT, exist_ok=True)
write("good", notes([(0, 660, .12, "sine", .5), (.1, 880, .2, "sine", .5)]))
write("bad", notes([(0, 200, .28, "square", .18)]))
write("pass", notes([(0, 420, .1, "triangle", .5)]))
write("tick", notes([(0, 880, .09, "square", .12)]))
write("go", notes([(0, 523, .14, "square", .14), (0, 784, .3, "square", .1), (0, 1047, .32, "sine", .3)]))
write("whistle", notes([(0, 2100, .5, "sine", .35), (0, 2160, .5, "sine", .25)]))
write("combo", notes([(i * .06, f, .14, "triangle", .45) for i, f in enumerate([659, 784, 988, 1319])]))
write("fanfare", notes([(0, 523, .16, "triangle", .45), (.16, 659, .16, "triangle", .45), (.32, 784, .16, "triangle", .45), (.48, 1047, .5, "triangle", .5), (.48, 784, .5, "sine", .25)]))
write("coin", notes([(0, 988, .08, "square", .12), (.07, 1319, .25, "square", .12)]))
write("clank", notes([(0, 180, .22, "square", .16), (0, 263, .18, "triangle", .3), (.02, 517, .12, "sine", .2)]))
write("steal", notes([(0, 330, .12, "square", .15), (.1, 220, .25, "square", .15)]))
write("pop", notes([(0, 600, .06, "sine", .5), (.03, 900, .08, "sine", .35)]))
write("bounce", notes([(0, 110, .09, "sine", .8), (0, 220, .05, "triangle", .3)]))
write("swish", notes([(0, 523, .12, "sine", .45), (.08, 659, .12, "sine", .45), (.16, 784, .12, "sine", .45), (.24, 1047, .3, "sine", .45)]))
write("rip", tear(.32, 900, .95))
write("zip", zipper(.32, 22))
