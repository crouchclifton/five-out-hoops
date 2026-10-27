# Round 5 (October 27, 2026): done

Clifton: "Work on the updates" (Hoop Wall), plus more lessons because his son finished them all quickly ("still from the first 6:10 of the video, but maybe review or broken down further or taught in a different way"), plus more cards because his son had only 3 left, "possibly make them harder to collect or don't give them out so often or so many at a time."

- **Hoop Wall** built as planned below, on Lesson 5. Defaults taken on the three open questions: top row +3, the name Hoop Wall, CPUs only race for points. CPU players are Sam, Zeke and Rex from the cards. Medal goals 14 / 22 / 30, set from a headless simulation: CPUs score about 12 / 16 / 21, a sloppy shooter about 18, a steady one about 25, a sharp one about 33.
- **Hoop Wall change (same day, after the full video clip was checked):** Clifton: "make the hoops move instead of the player moving. Moving the player in the right spot while also paying attention to the power meter is too complicated." Now all three rows slide (top right, gold middle left, bottom right, at different speeds) and every player stays in their own spot; the only control is hold and let go. While you hold, the hoop that will be over you when the ball arrives glows green. Scoring stays +1 / +2 / +3 (the clip showed +1 on the top row, but Clifton kept our scoring). CPUs re-tuned to about 11 / 15 / 18; medal goals now 13 / 20 / 27. The clip also showed a winner close-up ("Peach Wins"), a red timer near the end, hoops glowing in the scorer's color and missed balls resting on the court; only the scorer-color glow was added.
- **Unit 3: Practice Court**, five review lessons (7 to 11): Where Do I Go? (where the passer ends up after each of the 4 passes), Cut in Front (step away, then cut in front, 3:05), Corner Smarts (pass up from the corner, come back to the same corner, 5:06), Spot the Mistake (be the coach: which rule did they break?), Lightning Round (mixed, faster, no spot names, a point per read). A third gym bag sits after lesson 9. The backdoor cut (3:25) is still left out.
- **Cards**: 24 more (48 total), tips inside the first 6:10 or basic skills. Rarer: a lesson pays 2 cards only the first time; practicing pays 1 card, once a day; a medal card only for a better medal than that game ever gave; Skills Challenge pack 3 cards to 2; no more lean toward new cards (duplicates get more common as the binder fills); legendary pity 15 to 30; slightly lower odds.

# Round 4 (proposed October 22, 2026): Hoop Wall bonus game. Built in Round 5

Based on two screenshots Clifton sent from a Mario Party mini game (the YouTube video itself was not watched, to save tokens). Nothing is built yet.

**What the screenshots show:** a brick wall with three rows of hoops. Bottom row: 4 orange rims (+1). Middle row: 5 gold rims (+2) that slide sideways (the end hoops are cut off by the edges). Top row: 4 orange rims. Four players stand on the court, each with their own ball color, scores across the top, and a timer (about 20 seconds left in both shots).

**How it would play on the phone (one finger):**
1. Press and hold anywhere. Your player follows your finger left and right so you can line up under a hoop.
2. While you hold, a power meter beside your player fills up, then drains, then fills again (back and forth).
3. The meter has three colored bands, one per row. Let go in a band and the ball goes up to that row. Let go between bands and it clanks off the wall.
4. If you are lined up under a hoop in that row, it goes in: bottom +1, gold middle +2, top +3. The gold row moves, so it is harder.
5. 30 seconds, then a 1st to 4th place standings screen, then the usual medal screen.

**CPU players:** three made-up boys in their own jersey colors (no names stored, no real players). Each picks a hoop, walks under it, holds, and lets go with a small timing mistake. One is easy, one medium, one good, so a 7 to 9 year old can win with practice but not every time. Medals stay based on your points (like the other games), and your place is shown too.

**Where it goes:** it becomes Lesson 5's bonus game (Lesson 5 "Attack!" has none today). Lesson 6 and the trophy keep "pick any bonus game", so it shows up there too.

**Art style (Clifton, October 22, 2026): option 1, polished 2D.** Not 3D, and not trying to match the Switch. Same canvas drawing as the other bonus games, with more detail and "juice": a drawn brick wall, gold rims on the middle row, rims that wobble and nets that swish, shooters who crouch and jump when they shoot, confetti and screen shake on big scores, a crowd sound. Three.js with free 3D models was the step up, and it was turned down for now (heavier pages, stutter on older iPhones, generic characters).

**Teaching scope (Clifton, October 22, 2026):** the team is taught only up to about 6:10 of Coach Russ's video: setup, the three rules, and the four basic pass rotations (they end at 6:07; 6:07 to 7:08 is an ad). Everything after it (screens away, on-ball screens, pick and roll, backdoor cuts at 11:40, post seals) stays out. The captions with timestamps are kept locally in `local-data/coach-russ-video/` (gitignored, since the repo is public and the words are Coach Russ's).

**Work list:**
- `js/minigames.js`: new `HoopWall` class and a `GAMES.hoopwall` entry (title, intro, medal tiers). Reuses `drawHoop`, `drawBall`, `drawText`, `Floaters`.
- `js/lessons.js`: Lesson 5 `game: "hoopwall"`.
- `js/icons.js`: a drawn icon for the path node (a wall of three hoops).
- Voice: run `node tools/make-voice.mjs` for the new intro and any spoken lines.
- Run `node tools/stamp.mjs`, play-test in the browser, then the iPhone simulator.
- Tune the medal tiers from play-testing (first guess: bronze 8, silver 16, gold 24 points).

**Questions for Clifton before building:**
- Is the top row worth +3? The screenshots only show +1 (bottom) and +2 (gold middle). The top value is a guess.
- Name: "Hoop Wall" OK, or something else?
- Should the CPU players ever block or knock your ball (more chaos, more Mario Party), or just race for points (simpler for little kids)? Plan assumes just racing.

# Round 3 (October 22, 2026): done

Clifton asked for all the Duolingo ideas except recording his own voice (maybe later), plus player profiles. Built: hand-drawn SVG icons instead of emoji (js/icons.js); the Eagles identity (navy and orange, EAGLES on the gym floor, an original cartoon eagle mascot, never the league's logo; a credit line on the coaches page saying it is not an official league app); Unit 1 on an orange outdoor court and Unit 2 in the navy Eagles Gym; characters beside the path that move and cheer (js/cast.js); gym bags on the path; rewards one screen at a time (stars, XP, card pack, streak); streak milestones at 3, 7, 14, 30, 60 and 100 days with Coach Bounce on fire; Rest Day Passes (start with 1, earn one at each milestone from 7 on, hold 2); three daily Skills Challenges that pay a card pack (js/rewards.js); players as a face, jersey and number with no names, saved only on the phone, with per-player start over (js/profiles.js). Still Clifton's to do: playtest with a few players, and keep checking new features against Coach Russ's video.

# Round 2 (agreed with Clifton, October 22, 2026)

**Status, October 22, 2026: done.** All fixes 1 to 11, the Free Throw Frenzy floor (green zone never below .18 of the bar, speed capped at 1.2 sweeps a second, so the last shots still give about 150 ms), and the basketball cards. Added during the work at Clifton's request: Swish Shot's hoop no longer jumps across the screen when it speeds up, the home path no longer hangs 100 px off the right edge in Safari, every card player is a boy (boys-only league), and the coach's mouth now follows the speech instead of running through the quiet at the end of each clip. Big Game scoring went with "+1 per first-try read" (baskets still 2), not turnovers.

Source: Fable's review in `docs/review-2026-10-22.md` (item numbers below refer to it). Clifton said "go ahead" on the fixes and added the card idea.

## Clifton's calls

- **Keep bonus games at Mario Party difficulty.** His words: "kids are pretty good at video games, so anything similar to mario party should be fine for this age." So do NOT retune Dribble Dash (4), Free Throw Frenzy (5) or Swish Shot (14). Small exception worth considering: give Free Throw Frenzy's green zone a floor so it never gets faster than a person can react (the window shrinks to about 90 ms). Mention it, don't do more.
- **Voice is final:** Kokoro `am_adam` at 1.1x. Run `node tools/make-voice.mjs` after any text change; it re-records only new lines. Check new clips with whisper-cli (model at `~/work/points/tools/models/ggml-large-v3-turbo.bin`). Whisper hears "Swish" as "Swiss"; the phonemes are correct, so ignore that one. "Uh oh" can't be said naturally by the voice, so don't use it in any new line.
- **No real NBA players.** Names, likenesses, photos and real jersey numbers are off limits (right of publicity, NBPA licensing, photo copyright; the app is public). Use original cartoon players.

## Fixes to make

1. **Coach cut off mid-sentence (2).** `say()` returns a promise that resolves when the clip ends (timer fallback when sound is off or no clip); await it for informational lines. Questions stay interruptible.
2. **Install before playing on iPhone (1).** On iOS Safari, not standalone, show the Add to Home Screen sheet before the first lesson and say plainly that stars live in the icon, not in Safari.
3. **Service worker (3).** Build stamp in `sw.js` changed on every deploy (have make-voice or a tiny script write it), delete old caches on activate, re-precache voice clips, 3-second network timeout falling back to cache.
4. **Stale greeting (6)** and **small items (7):** always recompute the hero bubble; label the card "XP earned"; streak counts bonus games too; calendar-day streak math.
5. **Fade the 💤 (8).** Show it in early rounds of lessons 4 and 5, hide it later and in lesson 6. Give-and-go: cutter runs in front of a trailing defender.
6. **Rules in order (9).** Lesson 1's intro states all three rules; drop rule numbers from later intros or keep them consistent.
7. **Pass Pop (10).** Only flash OPEN on a teammate next to the ball (`PASSES[holder.spot]`).
8. **Lesson 2 cut question (11).** Rounds 3 to 5: no buttons, tap the hoop on the court.
9. **Big Game scoring (12).** Points follow reads: +1 per first-try correct read, or a wrong first answer is a turnover.
10. **No corner drives (13).** `drive: "open"` only from top or wing.
11. Nice-to-haves from (d) if cheap: speak the greeting on first tap; dim the decoy spots in lesson 1 part 2; Big Game 6 turns.

## New feature: basketball cards

Kids' favorites are Michael Jordan, Steph Curry and Victor Wembanyama. Capture the play style, never the person.

- **Original cartoon players**, drawn in SVG like Coach Bounce (varied skin tones, hair, jersey colors). Each card: name, fun nickname, signature move, rarity (common, rare, epic, legendary), four stats (Shooting, Passing, Speed, Defense), and a 5-Out tip on the back.
- **Legendary trio inspired by the favorites, with made-up names and different jersey numbers:** a high-flyer who dunks from the free throw line; a deep-range shooter with a shimmy after threes; a super-tall shot-blocker with an endless reach.
- **Earning:** a card pack after each lesson (3 stars improves the odds), a card for each bonus-game medal, a bonus pack on streak milestones. Duplicates turn into XP.
- **Card Binder** screen from the home top bar, with a flip-and-shine reveal animation for new cards.
- Probably 20 to 30 cards total.

## How to verify

Chrome playthrough bot and the iOS simulator setup are described in the memory note `five-out-hoops-game.md` (safaridriver with `safari:useSimulator`, its taps fire touchend but not click, so tap once to unlock sound then press buttons from JS). Test scripts from the last session were in `/tmp/fo-test/` and may be gone.
