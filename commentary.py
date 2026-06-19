#!/usr/bin/env python3
"""Live-Kommentarsystem für das Dart-Spiel."""

import random
import time
import sys
from dart_game import Color


class Commentary:
    THROW_COMMENTS = {
        "bullseye": [
            "BULLSEYE! Mitten ins Herz!",
            "DAS BULL! Was für ein Wurf!",
            "Voll ins Schwarze! Unfassbar!",
            "BULLSEYE! Die Crowd tobt!",
            "Direkt in die Mitte! Perfektion!",
        ],
        "bull": [
            "Bull! Knapp am perfekten Wurf!",
            "Bull! Gutes Auge!",
            "25 Punkte - solides Bull!",
            "Bull getroffen - so nah am Bullseye!",
        ],
        "triple": [
            "TRIPLE! Großartig getroffen!",
            "Ein Triple! Da sitzt der Pfeil!",
            "TRIPLE! Maximale Punkte auf dem Segment!",
            "Was ein Triple! Klasse Wurf!",
            "Triple getroffen! Stark!",
        ],
        "triple_20": [
            "TRIPLE 20! Die 180 ruft!",
            "T20! So werfen die Profis!",
            "Triple Zwanzig! Maximum!",
            "T20! Das Publikum klatscht!",
        ],
        "double": [
            "Double getroffen! Sauber!",
            "Ein Double! Gut gezielt!",
            "Double! Starker Wurf!",
        ],
        "miss": [
            "Daneben! Der Pfeil fliegt vorbei.",
            "Miss! Das Board bleibt unberührt.",
            "Kein Treffer - das kann passieren.",
            "Daneben! Nicht jeder Wurf sitzt.",
            "Verfehlt! Nächster Versuch wird besser.",
        ],
        "low": [
            "Naja, zählt trotzdem.",
            "Nicht optimal, aber Punkte sind Punkte.",
            "Bescheiden, aber auf dem Board.",
        ],
        "medium": [
            "Solider Wurf!",
            "Ordentlich getroffen.",
            "Passt! Guter Score.",
        ],
        "high_single": [
            "Schöner hoher Single!",
            "Starker Einzeltreffer!",
            "Gute Punkte geholt!",
        ],
    }

    ROUND_COMMENTS = {
        "perfect_180": [
            "180! EINHUNDERTACHTZIG! Das Maximum!",
            "ONE HUNDRED AND EIGHTY! Perfektion!",
            "180! Was für eine Runde! Absolut makellos!",
        ],
        "great_round": [
            "Was eine Runde! Über 100 Punkte!",
            "Century! Starke Runde!",
            "Über Hundert! So muss das!",
        ],
        "good_round": [
            "Gute Runde, ordentlicher Score.",
            "Solide Runde, das hilft!",
        ],
        "bad_round": [
            "Schwache Runde, das muss besser werden.",
            "Da war nicht viel drin...",
            "Enttäuschend. Mehr drin gewesen.",
        ],
        "bust": [
            "BUST! Überworfen! Die Runde zählt nicht!",
            "Bust! Zu gierig gewesen!",
            "Überworfen! Alles auf Anfang diese Runde!",
        ],
        "zero_round": [
            "Null Punkte! Das tut weh.",
            "Nichts getroffen! Bittere Runde.",
        ],
    }

    GAME_COMMENTS = {
        "checkout_range": [
            "Checkout-Range erreicht! Jetzt wird's spannend!",
            "Unter 170! Der Finish ist möglich!",
            "Im Checkout-Bereich! Spannung steigt!",
        ],
        "low_score": [
            "Nur noch wenige Punkte! Die Zielgerade!",
            "Fast geschafft! Konzentration!",
            "Es wird eng! Wer macht zuerst zu?",
        ],
        "close_game": [
            "Kopf-an-Kopf-Rennen! Drama pur!",
            "So knapp! Das wird ein Krimi!",
            "Eng beieinander! Wer hat die Nerven?",
        ],
        "dominant": [
            "Absolute Dominanz! Da gibt's nichts zu diskutieren.",
            "Klare Führung! Der Gegner muss aufholen!",
        ],
        "comeback": [
            "Das Blatt wendet sich! Was ein Comeback!",
            "Aufholjagd! Da ist wieder alles drin!",
            "Kommt da ein Comeback? Die Spannung wächst!",
        ],
    }

    FINISH_COMMENTS = [
        "UND AUS! Spiel vorbei!",
        "Das war's! Game, Set, Match!",
        "FINISH! Was ein Spiel!",
        "Und der letzte Pfeil sitzt! Gewonnen!",
        "DAS IST ES! Sieg!",
    ]

    def __init__(self, enabled=True, delay=0.3):
        self.enabled = enabled
        self.delay = delay
        self.last_comments = []
        self.round_count = 0
        self.throw_count = 0

    def _pick(self, options):
        available = [c for c in options if c not in self.last_comments]
        if not available:
            self.last_comments.clear()
            available = options
        choice = random.choice(available)
        self.last_comments.append(choice)
        if len(self.last_comments) > 10:
            self.last_comments.pop(0)
        return choice

    def _print(self, text, color=Color.GRAY):
        if not self.enabled:
            return
        time.sleep(self.delay)
        prefix = f"{Color.DIM}{Color.CYAN}💬{Color.RESET}"
        print(f"    {prefix} {color}{text}{Color.RESET}")

    def on_throw(self, result, points):
        if not self.enabled:
            return
        self.throw_count += 1
        if self.throw_count % 3 != 0 and random.random() > 0.4:
            return

        if result == "Bullseye":
            self._print(self._pick(self.THROW_COMMENTS["bullseye"]), Color.YELLOW)
        elif result == "Bull":
            self._print(self._pick(self.THROW_COMMENTS["bull"]), Color.GREEN)
        elif result == "Triple 20":
            self._print(self._pick(self.THROW_COMMENTS["triple_20"]), Color.RED)
        elif result.startswith("Triple"):
            self._print(self._pick(self.THROW_COMMENTS["triple"]), Color.RED)
        elif result.startswith("Double"):
            if random.random() > 0.5:
                self._print(self._pick(self.THROW_COMMENTS["double"]), Color.CYAN)
        elif result == "Miss":
            if random.random() > 0.4:
                self._print(self._pick(self.THROW_COMMENTS["miss"]), Color.GRAY)
        elif points >= 15:
            if random.random() > 0.7:
                self._print(self._pick(self.THROW_COMMENTS["high_single"]), Color.WHITE)
        elif points >= 8:
            if random.random() > 0.8:
                self._print(self._pick(self.THROW_COMMENTS["medium"]), Color.WHITE)
        elif points > 0 and random.random() > 0.85:
            self._print(self._pick(self.THROW_COMMENTS["low"]), Color.GRAY)

    def on_round_end(self, round_score, busted=False):
        if not self.enabled:
            return
        self.round_count += 1

        if busted:
            self._print(self._pick(self.ROUND_COMMENTS["bust"]), Color.RED)
        elif round_score == 180:
            self._print(self._pick(self.ROUND_COMMENTS["perfect_180"]),
                        f"{Color.BOLD}{Color.YELLOW}")
        elif round_score >= 100:
            self._print(self._pick(self.ROUND_COMMENTS["great_round"]), Color.GREEN)
        elif round_score >= 60:
            if random.random() > 0.6:
                self._print(self._pick(self.ROUND_COMMENTS["good_round"]), Color.WHITE)
        elif round_score == 0:
            self._print(self._pick(self.ROUND_COMMENTS["zero_round"]), Color.RED)
        elif round_score < 30 and random.random() > 0.5:
            self._print(self._pick(self.ROUND_COMMENTS["bad_round"]), Color.GRAY)

    def on_checkout_range(self, remaining):
        if not self.enabled:
            return
        if remaining <= 170 and remaining > 100:
            if random.random() > 0.6:
                self._print(self._pick(self.GAME_COMMENTS["checkout_range"]), Color.MAGENTA)
        elif remaining <= 40:
            self._print(self._pick(self.GAME_COMMENTS["low_score"]),
                        f"{Color.BOLD}{Color.MAGENTA}")

    def on_score_comparison(self, scores):
        if not self.enabled or len(scores) < 2 or self.round_count % 3 != 0:
            return
        sorted_scores = sorted(scores.values())
        diff = sorted_scores[-1] - sorted_scores[0]
        if diff < 50:
            self._print(self._pick(self.GAME_COMMENTS["close_game"]), Color.MAGENTA)
        elif diff > 200:
            self._print(self._pick(self.GAME_COMMENTS["dominant"]), Color.WHITE)

    def on_finish(self, player_name, darts):
        if not self.enabled:
            return
        self._print(self._pick(self.FINISH_COMMENTS), f"{Color.BOLD}{Color.YELLOW}")
        avg = f"{darts}" if darts else "?"
        self._print(f"{player_name} schließt mit {avg} Darts ab!", Color.YELLOW)

    def on_nine_darter_possible(self, darts_in_leg, score_left):
        if not self.enabled:
            return
        if darts_in_leg <= 6 and score_left <= 170:
            self._print(
                f"9-DARTER MÖGLICH! Noch {score_left} mit {9 - darts_in_leg} Darts!",
                f"{Color.BOLD}{Color.YELLOW}",
            )

    @staticmethod
    def toggle_prompt():
        print(f"\n  {Color.info('Kommentar-System:')}")
        print("    1) Kommentare AN")
        print("    2) Kommentare AUS")
        while True:
            choice = input("  Wahl (1-2): ").strip()
            if choice == "1":
                return True
            elif choice == "2":
                return False
            print("  Bitte 1 oder 2 wählen.")
