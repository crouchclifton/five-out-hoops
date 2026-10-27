# 5-Out Hoops

A phone game that teaches the 5-Out motion offense to 7 to 9 year old players on Coach Clifton's Eagles team (Southern Madison Future Eagles; not an official league app), with Coach Bounce, a Duolingo-style lesson path, and Mario Party-style bonus games.

Play it: https://crouchclifton.github.io/five-out-hoops/ (add it to the home screen so progress stays saved)

Based on Coach Russ's video "5-Out Motion Offense: A Complete Guide for Coaches" (https://youtu.be/PiR6-4Erhjw).

## Files

- `index.html`, `css/style.css`: the screens.
- `js/core.js`: helpers, sound and voice, players and their save data (in localStorage, on the phone only), the streak and Rest Day Passes.
- `js/icons.js`: every icon, drawn in SVG (no emoji), in the same style as Coach Bounce and the cards.
- `js/coach.js`: Coach Bounce, the animated mascot.
- `js/lessons.js`: the court, the 5-Out rotation and the eleven lessons (Unit 3 is review). Teaching stays inside the first 6:10 of the video.
- `js/minigames.js`: the seven bonus games (Swish Shot, Pass Pop, Free Throw Frenzy, Dribble Dash, Hoop Wall with three CPU players, and Unit 3's Rotation Rush and Cutter Catch).
- `js/cast.js`: the characters beside the lesson path (an original cartoon Eagles mascot, a ref, Eagles players).
- `js/rewards.js`: rewards one screen at a time (stars, XP, card pack, streak), the daily Skills Challenges, streak milestones and gym bags.
- `js/profiles.js`: "Who's playing?" and "Make your player". A player is a face, jersey and number, never a name.
- `js/cards.js`: the basketball cards: 48 original cartoon players (all boys, made-up names, no real NBA players), card packs and the Card Binder.
- `js/app.js`: the lesson path, rewards, coach notes, and the home screen app setup.
- `sw.js`, `manifest.webmanifest`, `icons/`: home screen app (PWA) and offline play. `sw.js` carries a build stamp; `node tools/stamp.mjs` updates it (make-voice runs it too). Run it before committing any code change, or phones keep the old saved copy.

## Sound

Sound comes from files, not the phone's built-in speech, because iPhone Safari's speech was silent and knocked out other sounds.

- `voice/` holds a recorded clip for every line the game says, plus the times each clip has speech so Coach Bounce's mouth moves only while he talks, made with the open-source Kokoro voice on a Mac (nothing sent to an outside service). After changing any game text, run `node tools/make-voice.mjs` to record new clips and delete old ones. It needs the Kokoro setup from Clifton's `claude-toolkit/narration` folder.
- `sfx/` holds the sound effects, built by `python3 tools/make-sfx.py`.

The voice is Kokoro's `am_adam` at 1.1x speed, picked by Clifton from samples on 2026-10-22.
