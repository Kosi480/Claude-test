#!/usr/bin/env python3
"""Text-basierte Soundeffekte und Atmosphäre fürs Dart-Spiel."""

import sys
import time
import random
from dart_game import Color


class SoundFX:
    CROWD_CHEERS = [
        "  🎉 *JJUUUUUBEL!* 🎉",
        "  👏👏👏 *APPLAUS* 👏👏👏",
        "  🙌 *TOOOOOR!* äh... *TREFFER!* 🙌",
        "  🎊 *Standing Ovation!* 🎊",
    ]

    CROWD_GASPS = [
        "  😲 *Oooooh!*",
        "  😮 *Aaaaah!*",
        "  🫣 *Staunen im Publikum*",
    ]

    CROWD_GROANS = [
        "  😩 *Ooooch...*",
        "  😬 *Stöhnen im Saal*",
        "  🤦 *Enttäuschtes Murmeln*",
    ]

    CROWD_SILENCE = [
        "  🤫 *...Stille...*",
        "  😶 *Man hört eine Nadel fallen*",
        "  🧘 *Absolute Konzentration*",
    ]

    DRUM_ROLL = [
        "  🥁 *rrrrrrrrr...*",
        "  🥁 *TROMMELWIRBEL*",
    ]

    IMPACT_SOUNDS = {
        "bullseye": [
            "  💥 *THWACK!* - Mitten rein!",
            "  🎯 *ZACK!* - Perfekt!",
            "  ⚡ *KNALL!* - Volltreffer!",
        ],
        "triple": [
            "  💫 *THUNK!* - Fester Treffer!",
            "  🔥 *WHAM!* - Eingeschlagen!",
        ],
        "double": [
            "  ✨ *TICK!* - Sauber!",
            "  🎯 *KLACK!* - Sitzt!",
        ],
        "normal": [
            "  🎯 *tock*",
            "  🎯 *tick*",
        ],
        "miss": [
            "  💨 *swoosh* - Vorbei!",
            "  🌬️ *pffft* - Daneben!",
            "  😅 *...* - Nix passiert.",
        ],
    }

    MUSIC_MOMENTS = {
        "tension": [
            f"  🎵 {Color.DIM}♪ dum dum duuuum... ♪{Color.RESET}",
            f"  🎵 {Color.DIM}♪ dun dun DUN... ♪{Color.RESET}",
        ],
        "victory": [
            f"  🎶 {Color.BOLD}♪ DA DA DA DAAAA! ♪{Color.RESET}",
            f"  🎶 {Color.BOLD}♪ We are the Champions! ♪{Color.RESET}",
            f"  🎶 {Color.BOLD}♪ TÖÖRÖÖ TÖÖRÖÖ! ♪{Color.RESET}",
        ],
        "walk_on": [
            f"  🎵 {Color.DIM}♪ Eye of the Tiger... ♪{Color.RESET}",
            f"  🎵 {Color.DIM}♪ Chase the Sun... ♪{Color.RESET}",
            f"  🎵 {Color.DIM}♪ Kernkraft 400... ♪{Color.RESET}",
        ],
    }

    def __init__(self, enabled=True, use_bell=False):
        self.enabled = enabled
        self.use_bell = use_bell

    def _play(self, text, delay=0.15):
        if not self.enabled:
            return
        time.sleep(delay)
        print(text)
        if self.use_bell:
            sys.stdout.write("\a")
            sys.stdout.flush()

    def throw_impact(self, result):
        if not self.enabled:
            return
        if result == "Bullseye":
            self._play(random.choice(self.IMPACT_SOUNDS["bullseye"]))
        elif result.startswith("Triple"):
            self._play(random.choice(self.IMPACT_SOUNDS["triple"]))
        elif result.startswith("Double"):
            if random.random() > 0.5:
                self._play(random.choice(self.IMPACT_SOUNDS["double"]))
        elif result == "Miss":
            if random.random() > 0.4:
                self._play(random.choice(self.IMPACT_SOUNDS["miss"]))
        elif random.random() > 0.85:
            self._play(random.choice(self.IMPACT_SOUNDS["normal"]))

    def crowd_reaction(self, event):
        if not self.enabled:
            return
        if event == "great":
            self._play(random.choice(self.CROWD_CHEERS))
        elif event == "amazing":
            self._play(random.choice(self.CROWD_GASPS))
            time.sleep(0.2)
            self._play(random.choice(self.CROWD_CHEERS))
        elif event == "miss":
            if random.random() > 0.5:
                self._play(random.choice(self.CROWD_GROANS))
        elif event == "tension":
            self._play(random.choice(self.CROWD_SILENCE))

    def drum_roll(self):
        if not self.enabled:
            return
        self._play(random.choice(self.DRUM_ROLL), delay=0.1)

    def music(self, moment):
        if not self.enabled:
            return
        if moment in self.MUSIC_MOMENTS:
            self._play(random.choice(self.MUSIC_MOMENTS[moment]))

    def atmosphere_for_throw(self, result, points, remaining):
        if not self.enabled:
            return

        self.throw_impact(result)

        if result == "Bullseye":
            self.crowd_reaction("amazing")
        elif result.startswith("Triple") and points >= 45:
            self.crowd_reaction("great")
        elif result == "Miss" and remaining <= 50:
            self.crowd_reaction("miss")

        if remaining <= 40 and remaining > 0 and random.random() > 0.5:
            self.music("tension")

    def atmosphere_for_round(self, round_score, remaining):
        if not self.enabled:
            return

        if round_score >= 180:
            self.crowd_reaction("amazing")
            self.music("victory")
        elif round_score >= 140:
            self.crowd_reaction("great")
        elif round_score == 0:
            self.crowd_reaction("miss")

    def atmosphere_for_finish(self):
        if not self.enabled:
            return
        self.drum_roll()
        time.sleep(0.3)
        self.crowd_reaction("amazing")
        self.music("victory")

    def walk_on(self, player_name):
        if not self.enabled:
            return
        print(f"\n  {Color.BOLD}{Color.MAGENTA}>> {player_name} betritt die Bühne! <<{Color.RESET}")
        self.music("walk_on")
        self.crowd_reaction("great")

    def match_point_tension(self):
        if not self.enabled:
            return
        self.crowd_reaction("tension")
        self.drum_roll()

    @staticmethod
    def toggle_prompt():
        print(f"\n  {Color.info('Sound-Effekte:')}")
        print("    1) Sounds AN")
        print("    2) Sounds AUS")
        print("    3) Sounds AN + Terminal-Bell")
        while True:
            choice = input("  Wahl (1-3): ").strip()
            if choice == "1":
                return True, False
            elif choice == "2":
                return False, False
            elif choice == "3":
                return True, True
            print("  Bitte 1-3 wählen.")


def demo_sounds():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'SOUND-DEMO':^50}"))
    print(Color.muted("=" * 50))

    sfx = SoundFX(enabled=True, use_bell=False)

    print(f"\n  {Color.info('Walk-On:')}")
    sfx.walk_on("Demo-Spieler")
    time.sleep(0.5)

    print(f"\n  {Color.info('Bullseye-Treffer:')}")
    sfx.atmosphere_for_throw("Bullseye", 50, 451)
    time.sleep(0.5)

    print(f"\n  {Color.info('Triple 20:')}")
    sfx.atmosphere_for_throw("Triple 20", 60, 391)
    time.sleep(0.5)

    print(f"\n  {Color.info('Miss bei engem Spiel:')}")
    sfx.atmosphere_for_throw("Miss", 0, 32)
    time.sleep(0.5)

    print(f"\n  {Color.info('180er Runde:')}")
    sfx.atmosphere_for_round(180, 321)
    time.sleep(0.5)

    print(f"\n  {Color.info('Match-Finish:')}")
    sfx.atmosphere_for_finish()

    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
