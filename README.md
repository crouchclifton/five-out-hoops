# 5-Out Hoops

A phone-friendly web game that teaches the basics of the 5-Out motion offense to 7 to 9 year old players.

Play it: https://crouchclifton.github.io/five-out-hoops/

Based on Coach Russ's video "5-Out Motion Offense: A Complete Guide for Coaches" (https://youtu.be/PiR6-4Erhjw).
The game is `index.html`, with no outside libraries. Sound comes from files, not the phone's built-in speech, because iPhone Safari's speech was silent and knocked out other sounds:

- `voice/` holds a recorded clip for every line the game says. After changing any game text, run `node tools/make-voice.mjs` on a Mac to record new clips and delete old ones.
- `sfx/` holds the sound effects, built by `python3 tools/make-sfx.py`.
