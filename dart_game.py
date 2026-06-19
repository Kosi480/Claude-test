#!/usr/bin/env python3
"""Ein interaktives Dart-Spiel für die Kommandozeile."""

import json
import math
import os
import random
import sys
import time
from datetime import datetime


class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    GRAY = "\033[90m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"

    @staticmethod
    def colorize_result(result, points):
        if result == "Bullseye":
            return f"{Color.BOLD}{Color.YELLOW}{result} ({points}){Color.RESET}"
        elif result == "Bull":
            return f"{Color.BOLD}{Color.GREEN}{result} ({points}){Color.RESET}"
        elif result.startswith("Triple"):
            return f"{Color.BOLD}{Color.RED}{result} ({points}){Color.RESET}"
        elif result.startswith("Double"):
            return f"{Color.BOLD}{Color.CYAN}{result} ({points}){Color.RESET}"
        elif result == "Miss":
            return f"{Color.DIM}{Color.GRAY}{result} ({points}){Color.RESET}"
        else:
            return f"{Color.WHITE}{result} ({points}){Color.RESET}"

    @staticmethod
    def title(text):
        return f"{Color.BOLD}{Color.YELLOW}{text}{Color.RESET}"

    @staticmethod
    def success(text):
        return f"{Color.BOLD}{Color.GREEN}{text}{Color.RESET}"

    @staticmethod
    def warning(text):
        return f"{Color.BOLD}{Color.RED}{text}{Color.RESET}"

    @staticmethod
    def info(text):
        return f"{Color.CYAN}{text}{Color.RESET}"

    @staticmethod
    def muted(text):
        return f"{Color.GRAY}{text}{Color.RESET}"


SKILL_LEVELS = {
    "anfänger":       {"spread": 0.55, "label": "Anfänger",       "desc": "Große Streuung, viele Misses"},
    "gelegenheit":    {"spread": 0.42, "label": "Gelegenheit",    "desc": "Lockerer Kneipenabend"},
    "standard":       {"spread": 0.35, "label": "Standard",       "desc": "Normaler Dartspieler"},
    "fortgeschritten":{"spread": 0.27, "label": "Fortgeschritten","desc": "Vereinsspieler-Niveau"},
    "profi":          {"spread": 0.18, "label": "Profi",          "desc": "Turnier-Genauigkeit"},
}
SKILL_ORDER = ["anfänger", "gelegenheit", "standard", "fortgeschritten", "profi"]


class DartBoard:
    SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

    def throw(self, spread=0.35):
        accuracy = random.gauss(0, spread)

        if abs(accuracy) < 0.05:
            return ("Bullseye", 50)
        elif abs(accuracy) < 0.12:
            return ("Bull", 25)

        segment_index = random.randint(0, 19)
        segment = self.SEGMENTS[segment_index]

        ring = abs(accuracy)
        if ring < 0.25:
            return (f"Triple {segment}", segment * 3)
        elif ring < 0.45:
            return (f"{segment}", segment)
        elif ring < 0.55:
            return (f"Double {segment}", segment * 2)
        elif ring < 0.7:
            return (f"{segment}", segment)
        else:
            return ("Miss", 0)


class AsciiDartBoard:
    RADIUS = 9
    SEGMENTS = DartBoard.SEGMENTS

    def render(self, hit_result):
        size = self.RADIUS * 2 + 1
        cx, cy = self.RADIUS, self.RADIUS
        grid = [[' ' for _ in range(size * 2)] for _ in range(size)]

        for y in range(size):
            for x_idx in range(size * 2):
                x = x_idx / 2.0
                dx = x - cx
                dy = y - cy
                dist = math.sqrt(dx * dx + dy * dy)

                if dist <= 1:
                    grid[y][x_idx] = '#'
                elif dist <= 2:
                    grid[y][x_idx] = '@'
                elif dist <= 5:
                    grid[y][x_idx] = '.'
                elif dist <= 6:
                    grid[y][x_idx] = ':'
                elif dist <= 8:
                    grid[y][x_idx] = '.'
                elif dist <= 9:
                    grid[y][x_idx] = ':'
                elif abs(dist - 9.5) < 0.7:
                    grid[y][x_idx] = '-'

        hx, hy = self._hit_position(hit_result, cx, cy)
        if 0 <= hy < size and 0 <= hx < size * 2:
            grid[hy][hx] = 'X'

        lines = []
        lines.append(f"    {'':^{size * 2}}")
        for row in grid:
            lines.append("    " + "".join(row))
        return "\n".join(lines)

    def _hit_position(self, result, cx, cy):
        if result == "Bullseye":
            return cx * 2, cy
        elif result == "Bull":
            angle = random.uniform(0, 2 * math.pi)
            return int(cx * 2 + 1.5 * math.cos(angle)), int(cy + 1.5 * math.sin(angle))
        elif result == "Miss":
            angle = random.uniform(0, 2 * math.pi)
            return int(cx * 2 + 10 * math.cos(angle)), int(cy + 10 * math.sin(angle))

        if result.startswith("Triple"):
            dist = 5.5
        elif result.startswith("Double"):
            dist = 8.5
        else:
            dist = random.choice([3.5, 7.0])

        segment_str = result.split()[-1]
        try:
            segment_num = int(segment_str)
        except ValueError:
            return cx * 2, cy

        if segment_num in self.SEGMENTS:
            idx = self.SEGMENTS.index(segment_num)
        else:
            idx = 0
        angle = (idx * 18 - 90) * math.pi / 180

        hx = int(cx * 2 + dist * math.cos(angle) * 1.0)
        hy = int(cy + dist * math.sin(angle))
        return hx, hy


class Statistics:
    def __init__(self):
        self.throws = []
        self.round_scores = []
        self.busts = 0
        self.bullseyes = 0
        self.triples = 0
        self.doubles = 0
        self.misses = 0

    def record_throw(self, result, points):
        self.throws.append((result, points))
        if result == "Bullseye":
            self.bullseyes += 1
        elif result.startswith("Triple"):
            self.triples += 1
        elif result.startswith("Double"):
            self.doubles += 1
        elif result == "Miss":
            self.misses += 1

    def record_round(self, score):
        self.round_scores.append(score)

    def record_bust(self):
        self.busts += 1

    @property
    def average_per_round(self):
        if not self.round_scores:
            return 0.0
        return sum(self.round_scores) / len(self.round_scores)

    @property
    def highest_round(self):
        return max(self.round_scores) if self.round_scores else 0

    @property
    def highest_throw(self):
        return max((p for _, p in self.throws), default=0)

    def display(self, player_name):
        print(f"\n{'─' * 40}")
        print(f"  Statistik: {player_name}")
        print(f"{'─' * 40}")
        print(f"  Würfe gesamt:       {len(self.throws)}")
        print(f"  Durchschnitt/Runde: {self.average_per_round:.1f}")
        print(f"  Höchste Runde:      {self.highest_round}")
        print(f"  Höchster Wurf:      {self.highest_throw}")
        print(f"  Bullseyes:          {self.bullseyes}")
        print(f"  Triples:            {self.triples}")
        print(f"  Doubles:            {self.doubles}")
        print(f"  Misses:             {self.misses}")
        print(f"  Busts:              {self.busts}")
        print(f"{'─' * 40}")


GAME_MODES = {
    "301": 301,
    "501": 501,
    "701": 701,
}


class Player:
    def __init__(self, name, start_score=501, is_cpu=False, skill="standard"):
        self.name = name
        self.score = start_score
        self.start_score = start_score
        self.darts_thrown = 0
        self.rounds = 0
        self.stats = Statistics()
        self.is_cpu = is_cpu
        self.skill = skill
        self.spread = SKILL_LEVELS[skill]["spread"]

    def update_score(self, points):
        if self.score - points < 0:
            return False
        self.score -= points
        self.darts_thrown += 1
        return True


class CPUPlayer(Player):
    DIFFICULTIES = {
        "leicht": 0.50,
        "mittel": 0.35,
        "schwer": 0.20,
    }
    DIFFICULTY_NAMES = {
        "leicht": "Anfänger",
        "mittel": "Fortgeschritten",
        "schwer": "Profi",
    }

    def __init__(self, name, difficulty="mittel", start_score=501):
        super().__init__(name, start_score=start_score, is_cpu=True)
        self.difficulty = difficulty
        self.spread = self.DIFFICULTIES[difficulty]

    def cpu_throw(self):
        accuracy = random.gauss(0, self.spread)

        if abs(accuracy) < 0.05:
            return ("Bullseye", 50)
        elif abs(accuracy) < 0.12:
            return ("Bull", 25)

        segments = DartBoard.SEGMENTS
        if self.difficulty == "schwer":
            target = 20
            nearby = [20, 1, 5]
            segment = random.choices(
                [target] + nearby,
                weights=[0.6, 0.15, 0.15, 0.1],
            )[0]
        elif self.difficulty == "mittel":
            segment = random.choices(
                segments,
                weights=[3 if s >= 15 else 1 for s in segments],
            )[0]
        else:
            segment = random.choice(segments)

        ring = abs(accuracy)
        if ring < 0.25:
            return (f"Triple {segment}", segment * 3)
        elif ring < 0.45:
            return (f"{segment}", segment)
        elif ring < 0.55:
            return (f"Double {segment}", segment * 2)
        elif ring < 0.7:
            return (f"{segment}", segment)
        else:
            return ("Miss", 0)


CHECKOUTS = {
    170: "T20 T20 Bull",
    167: "T20 T19 Bull",
    164: "T20 T18 Bull",
    161: "T20 T17 Bull",
    160: "T20 T20 D20",
    158: "T20 T20 D19",
    157: "T20 T19 D20",
    156: "T20 T20 D18",
    155: "T20 T19 D19",
    154: "T20 T18 D20",
    153: "T20 T19 D18",
    152: "T20 T20 D16",
    151: "T20 T17 D20",
    150: "T20 T18 D18",
    149: "T20 T19 D16",
    148: "T20 T16 D20",
    147: "T20 T17 D18",
    146: "T20 T18 D16",
    145: "T20 T15 D20",
    144: "T20 T20 D12",
    143: "T20 T17 D16",
    142: "T20 T14 D20",
    141: "T20 T19 D12",
    140: "T20 T20 D10",
    139: "T20 T13 D20",
    138: "T20 T18 D12",
    137: "T20 T19 D10",
    136: "T20 T20 D8",
    135: "T20 T17 D12",
    134: "T20 T14 D16",
    133: "T20 T19 D8",
    132: "T20 T16 D12",
    131: "T20 T13 D16",
    130: "T20 T18 D8",
    129: "T19 T16 D12",
    128: "T18 T14 D16",
    127: "T20 T17 D8",
    126: "T19 T19 D6",
    125: "T20 T15 D10",
    124: "T20 T16 D8",
    123: "T19 T16 D9",
    122: "T18 T20 D4",
    121: "T20 T11 D14",
    120: "T20 20 D20",
    119: "T19 T12 D13",
    118: "T20 18 D20",
    117: "T20 17 D20",
    116: "T20 16 D20",
    115: "T20 15 D20",
    114: "T20 14 D20",
    113: "T20 13 D20",
    112: "T20 12 D20",
    111: "T20 11 D20",
    110: "T20 10 D20",
    109: "T20 9 D20",
    108: "T20 8 D20",
    107: "T19 10 D20",
    106: "T20 6 D20",
    105: "T20 5 D20",
    104: "T18 10 D20",
    103: "T19 6 D20",
    102: "T20 2 D20",
    101: "T17 10 D20",
    100: "T20 D20",
    99: "T19 2 D20",
    98: "T20 D19",
    97: "T19 D20",
    96: "T20 D18",
    95: "T19 D19",
    94: "T18 D20",
    93: "T19 D18",
    92: "T20 D16",
    91: "T17 D20",
    90: "T18 D18",
    89: "T19 D16",
    88: "T16 D20",
    87: "T17 D18",
    86: "T18 D16",
    85: "T15 D20",
    84: "T20 D12",
    83: "T17 D16",
    82: "T14 D20",
    81: "T19 D12",
    80: "T20 D10",
    79: "T13 D20",
    78: "T18 D12",
    77: "T19 D10",
    76: "T20 D8",
    75: "T17 D12",
    74: "T14 D16",
    73: "T19 D8",
    72: "T16 D12",
    71: "T13 D16",
    70: "T18 D8",
    69: "T19 D6",
    68: "T20 D4",
    67: "T17 D8",
    66: "T10 D18",
    65: "T19 D4",
    64: "T16 D8",
    63: "T13 D12",
    62: "T10 D16",
    61: "T15 D8",
    60: "20 D20",
    59: "19 D20",
    58: "18 D20",
    57: "17 D20",
    56: "16 D20",
    55: "15 D20",
    54: "14 D20",
    53: "13 D20",
    52: "12 D20",
    51: "11 D20",
    50: "Bull",
    49: "9 D20",
    48: "8 D20",
    47: "7 D20",
    46: "6 D20",
    45: "13 D16",
    44: "4 D20",
    43: "3 D20",
    42: "10 D16",
    41: "9 D16",
    40: "D20",
    39: "7 D16",
    38: "D19",
    36: "D18",
    34: "D17",
    32: "D16",
    30: "D15",
    28: "D14",
    26: "D13",
    24: "D12",
    22: "D11",
    20: "D10",
    18: "D9",
    16: "D8",
    14: "D7",
    12: "D6",
    10: "D5",
    8: "D4",
    6: "D3",
    4: "D2",
    2: "D1",
}


def show_checkout_hint(remaining):
    if remaining in CHECKOUTS:
        print(f"    {Color.BOLD}{Color.MAGENTA}** CHECKOUT: {CHECKOUTS[remaining]} **{Color.RESET}")
    elif remaining <= 170:
        print(Color.muted(f"    (Kein Standard-Checkout für {remaining})"))


def display_scoreboard(players):
    print("\n" + Color.muted("=" * 40))
    print(Color.title(f"{'SCOREBOARD':^40}"))
    print(Color.muted("=" * 40))
    for p in players:
        score_color = Color.success if p.score < 100 else (Color.info if p.score < 200 else lambda x: x)
        print(f"  {p.name:<20} {score_color(f'{p.score:>5}')} Punkte")
    print(Color.muted("=" * 40))


ascii_board = AsciiDartBoard()


def throw_animation():
    frames = [
        "    🎯  ·                        ",
        "    🎯      ·                    ",
        "    🎯          ·                ",
        "    🎯              ·            ",
        "    🎯                  ·        ",
        "    🎯                      ·    ",
        "    🎯                        ·  ",
        "    🎯                         ✦ ",
    ]
    for frame in frames:
        sys.stdout.write(f"\r{frame}")
        sys.stdout.flush()
        time.sleep(0.06)
    sys.stdout.write("\r" + " " * 40 + "\r")
    sys.stdout.flush()


def celebration_animation(result):
    if result == "Bullseye":
        frames = ["  ★ BULLSEYE ★", "  ☆ BULLSEYE ☆", "  ★ BULLSEYE ★", "  ☆ BULLSEYE ☆"]
        color = Color.YELLOW
    elif result.startswith("Triple"):
        frames = [f"  » {result} «", f"  « {result} »", f"  » {result} «"]
        color = Color.RED
    elif result == "Bull":
        frames = [f"  > {result} <", f"  < {result} >", f"  > {result} <"]
        color = Color.GREEN
    else:
        return

    for frame in frames:
        sys.stdout.write(f"\r{Color.BOLD}{color}{frame}{Color.RESET}")
        sys.stdout.flush()
        time.sleep(0.15)
    sys.stdout.write("\r" + " " * 40 + "\r")
    sys.stdout.flush()


def play_round(player, board, recorder=None, commentary=None):
    print(f"\n{Color.BOLD}--- {player.name} ist dran (Runde {player.rounds + 1}) ---{Color.RESET}")
    print(f"    Verbleibend: {Color.info(f'{player.score} Punkte')}")
    if player.score <= 170 and not player.is_cpu:
        show_checkout_hint(player.score)
        if commentary:
            commentary.on_checkout_range(player.score)

    round_score = 0
    for dart in range(1, 4):
        if player.is_cpu:
            time.sleep(0.5)
            print(Color.muted(f"  Dart {dart}/3 - {player.name} wirft..."))
            time.sleep(0.3)
            result, points = player.cpu_throw()
        else:
            input(f"  Dart {dart}/3 - [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw(spread=player.spread)

        player.stats.record_throw(result, points)
        if not player.is_cpu:
            try:
                from heatmap import HeatmapTracker
                HeatmapTracker.record_throw(player.name, result, points)
            except ImportError:
                pass
            print(ascii_board.render(result))
            celebration_animation(result)

        if player.score - round_score - points < 0:
            print(f"    -> {Color.warning('BUST!')} {Color.colorize_result(result, points)} - Runde ungültig!")
            player.stats.record_bust()
            player.stats.record_round(0)
            if recorder:
                recorder.record_bust(player.name, result, points, player.score)
            if commentary:
                commentary.on_round_end(0, busted=True)
            return

        score_before = player.score - round_score
        round_score += points
        player.darts_thrown += 1
        remaining_after = player.score - round_score
        print(f"    -> {Color.colorize_result(result, points)} | Runden-Summe: {Color.BOLD}{round_score}{Color.RESET}")
        if commentary:
            commentary.on_throw(result, points)
        if recorder:
            recorder.record_throw(player.name, result, points, score_before, remaining_after)
        if remaining_after <= 170 and remaining_after > 0 and not player.is_cpu and dart < 3:
            show_checkout_hint(remaining_after)
        if commentary:
            commentary.on_nine_darter_possible(player.darts_thrown, remaining_after)

    player.score -= round_score
    player.rounds += 1
    player.stats.record_round(round_score)
    if recorder:
        recorder.record_round_end(player.name, round_score, player.score)
    if commentary:
        commentary.on_round_end(round_score)
    print(f"    Neuer Stand: {Color.info(f'{player.score} Punkte')}")


HIGHSCORE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "highscores.json")
CPU_NAMES = ["Robo-Phil", "DartBot 3000", "KI-Taylor", "CyberBull"]


class Highscores:
    MAX_ENTRIES = 10

    @staticmethod
    def load():
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, "r") as f:
                return json.load(f)
        return []

    @staticmethod
    def save(entries):
        with open(HIGHSCORE_FILE, "w") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)

    @classmethod
    def add_entry(cls, name, darts, avg_round, date=None):
        entries = cls.load()
        entries.append({
            "name": name,
            "darts": darts,
            "avg_round": round(avg_round, 1),
            "date": date or datetime.now().strftime("%Y-%m-%d %H:%M"),
        })
        entries.sort(key=lambda e: e["darts"])
        entries = entries[:cls.MAX_ENTRIES]
        cls.save(entries)
        return entries

    @classmethod
    def display(cls):
        entries = cls.load()
        print(f"\n{'=' * 50}")
        print(f"{'HIGHSCORES - Top 10':^50}")
        print(f"{'=' * 50}")
        if not entries:
            print("  Noch keine Einträge vorhanden.")
        else:
            print(f"  {'#':<4} {'Name':<18} {'Darts':>6} {'Avg/Rnd':>8} {'Datum':>12}")
            print(f"  {'─' * 46}")
            for i, e in enumerate(entries, 1):
                print(f"  {i:<4} {e['name']:<18} {e['darts']:>6} {e['avg_round']:>8.1f} {e['date']:>12}")
        print(f"{'=' * 50}")


def choose_difficulty():
    print("\n  KI-Schwierigkeit:")
    print("    1) Leicht   (Anfänger)")
    print("    2) Mittel   (Fortgeschritten)")
    print("    3) Schwer   (Profi)")
    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            return "leicht"
        elif choice == "2":
            return "mittel"
        elif choice == "3":
            return "schwer"
        print("  Bitte 1, 2 oder 3 wählen.")


def choose_game_mode():
    print("\n  Punkte-Modus:")
    print("    1) 301  (Kurzes Spiel)")
    print("    2) 501  (Standard)")
    print("    3) 701  (Langes Spiel)")
    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            return 301
        elif choice == "2":
            return 501
        elif choice == "3":
            return 701
        print("  Bitte 1, 2 oder 3 wählen.")


def play_leg(players, board, start_score, leg_label="", recorder=None, commentary=None):
    for p in players:
        p.score = start_score
        p.darts_thrown = 0
        p.rounds = 0
        p.stats = Statistics()

    if leg_label:
        print(f"\n{Color.BOLD}{Color.MAGENTA}  === {leg_label} ==={Color.RESET}")

    while True:
        display_scoreboard(players)
        if commentary and len(players) >= 2:
            commentary.on_score_comparison({p.name: p.score for p in players})
        for player in players:
            play_round(player, board, recorder=recorder, commentary=commentary)
            if player.score == 0:
                print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 40}")
                print(f"  {player.name} gewinnt das Leg mit {player.darts_thrown} Darts!")
                print(f"{'*' * 40}{Color.RESET}")
                if recorder:
                    recorder.record_win(player.name, player.darts_thrown)
                if commentary:
                    commentary.on_finish(player.name, player.darts_thrown)
                return player


def display_set_standings(set_wins, players, sets_to_win):
    print(f"\n{Color.muted('─' * 40)}")
    print(Color.title(f"{'SET-STAND':^40}"))
    print(Color.muted("─" * 40))
    for p in players:
        wins = set_wins.get(p.name, 0)
        bar = "█" * wins + "░" * (sets_to_win - wins)
        print(f"  {p.name:<20} {bar} {wins}/{sets_to_win}")
    print(Color.muted("─" * 40))


def choose_tournament_mode():
    print(f"\n  {Color.title('Turnier-Modus:')}")
    print("    1) Einzelspiel (1 Leg)")
    print("    2) Best of 3 Sets")
    print("    3) Best of 5 Sets")
    print("    4) Best of 7 Sets (WM-Finale)")
    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            return 1
        elif choice == "2":
            return 3
        elif choice == "3":
            return 5
        elif choice == "4":
            return 7
        print("  Bitte 1, 2, 3 oder 4 wählen.")


def choose_skill():
    print(f"\n  {Color.info('Skill-Level wählen:')}")
    for i, key in enumerate(SKILL_ORDER, 1):
        info = SKILL_LEVELS[key]
        print(f"    {i}) {info['label']:<16} {Color.muted(info['desc'])}")
    while True:
        choice = input("  Wahl (1-5): ").strip()
        if choice in ("1", "2", "3", "4", "5"):
            return SKILL_ORDER[int(choice) - 1]
        print("  Bitte 1-5 wählen.")


def setup_players(start_score=501, is_cricket=False):
    print("\n  Gegner-Modus:")
    print("    1) Nur Menschen")
    print("    2) Gegen KI-Gegner")
    while True:
        mode = input("  Wahl (1-2): ").strip()
        if mode in ("1", "2"):
            break
        print("  Bitte 1 oder 2 wählen.")

    num_players = 0
    while num_players < 1:
        try:
            max_p = 4 if mode == "1" else 3
            num_players = int(input(f"\nAnzahl menschliche Spieler (1-{max_p}): "))
            if num_players < 1 or num_players > max_p:
                num_players = 0
                print(f"Bitte 1-{max_p} Spieler wählen.")
        except ValueError:
            print("Bitte eine Zahl eingeben.")

    print(Color.info("\n  Spieler-Skill (beeinflusst Wurfgenauigkeit):"))
    shared_skill = num_players > 1
    if shared_skill:
        print("  Gleiches Skill-Level für alle Spieler?")
        use_shared = input("  (j/n): ").strip().lower()
        shared_skill = use_shared != "n"

    if shared_skill and num_players > 1:
        skill = choose_skill()
    else:
        skill = None

    players = []
    for i in range(num_players):
        name = input(f"\nName Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        if skill:
            player_skill = skill
        else:
            print(f"  Skill für {name}:")
            player_skill = choose_skill()
        skill_label = SKILL_LEVELS[player_skill]["label"]
        print(f"  {Color.muted(f'  -> {name}: {skill_label}')}")
        players.append(Player(name, start_score=start_score, skill=player_skill))

    if mode == "2":
        num_cpu = 0
        max_cpu = 4 - num_players
        while num_cpu < 1:
            try:
                num_cpu = int(input(f"\nAnzahl KI-Gegner (1-{max_cpu}): "))
                if num_cpu < 1 or num_cpu > max_cpu:
                    num_cpu = 0
                    print(f"Bitte 1-{max_cpu} wählen.")
            except ValueError:
                print("Bitte eine Zahl eingeben.")

        difficulty = choose_difficulty()
        for i in range(num_cpu):
            cpu_name = CPU_NAMES[i % len(CPU_NAMES)]
            diff_label = CPUPlayer.DIFFICULTY_NAMES[difficulty]
            cpu = CPUPlayer(f"{cpu_name} ({diff_label})", difficulty, start_score=start_score)
            players.append(cpu)

    return players


def main():
    print(Color.muted("=" * 40))
    print(Color.title(f"{'DART SPIEL':^40}"))
    print(Color.muted("=" * 40))

    print("\n  Hauptmenü:")
    print("    1) Neues Spiel (501/301/701)")
    print("    2) Cricket-Modus")
    print("    3) Party-Minispiele (Killer, Shanghai, Bingo)")
    print("    4) Training (inkl. Speed Darts)")
    print("    5) Tägliche Challenge")
    print("    6) Replays ansehen")
    print("    7) Leaderboard (Elo-Rangliste)")
    print("    8) Highscores anzeigen")
    print("    9) Spieler-Profil anzeigen")
    print("    s) Statistik-Dashboard")
    print("    c) Custom Game (eigene Regeln)")
    print("    d) Sound-Demo")
    print("    t) Dart-Trivia-Quiz")
    print("    h) Spielverlauf")
    print("    r) Checkout-Rechner")
    print("    w) Wurf-Heatmap")
    print("    b) Dart-Kasino (Wetten)")
    print("    n) Saison-System")
    print("    k) Bracket-Turnier (4/8 Spieler)")
    print("    x) Dart-Simulator (CPU vs CPU)")
    print("    l) Dart-Liga (Meisterschaft)")
    print("    u) Dart Duel (1v1 Challenge)")
    print("    p) Statistik-Export")
    print("    v) Handicap-System")
    print("    g) Records & Streaks")
    print("    y) Party-Modus (Elimination)")
    print("    z) Countdown (Zeitdruck)")
    print("    j) World Tour (Weltreise)")
    print("    e) Einstellungen")
    print("    ?) Hilfe & Tutorial")
    print("    0) Beenden")
    while True:
        menu = input("  Wahl (0-9/s): ").strip().lower()
        if menu == "0":
            print(Color.info("\nDanke fürs Spielen! Bis zum nächsten Mal!"))
            return
        if menu == "s":
            from stats_dashboard import stats_menu
            stats_menu()
            continue
        if menu == "c":
            from custom_game import custom_game_menu
            custom_game_menu()
            print(Color.info("\nDanke fürs Spielen!"))
            return
        if menu == "d":
            from sounds import demo_sounds
            demo_sounds()
            continue
        if menu == "t":
            from trivia import trivia_menu
            trivia_menu()
            continue
        if menu == "h":
            from match_history import history_menu
            history_menu()
            continue
        if menu == "r":
            from calculator import calculator_menu
            calculator_menu()
            continue
        if menu == "w":
            from heatmap import heatmap_menu
            heatmap_menu()
            continue
        if menu == "b":
            from betting import betting_menu
            betting_menu()
            continue
        if menu == "n":
            from seasons import seasons_menu
            seasons_menu()
            continue
        if menu == "k":
            from bracket import bracket_menu
            bracket_menu()
            print(Color.info("\nDanke fürs Spielen!"))
            return
        if menu == "x":
            from simulator import simulator_menu
            simulator_menu()
            continue
        if menu == "l":
            from league import league_menu
            league_menu()
            continue
        if menu == "u":
            from duel import duel_menu
            duel_menu()
            continue
        if menu == "p":
            from export import export_menu
            export_menu()
            continue
        if menu == "v":
            from handicap import handicap_menu
            handicap_menu()
            continue
        if menu == "g":
            from records import records_menu
            records_menu()
            continue
        if menu == "y":
            from party import party_menu
            party_menu()
            continue
        if menu == "z":
            from countdown import countdown_menu
            countdown_menu()
            continue
        if menu == "j":
            from world_tour import world_tour_menu
            world_tour_menu()
            continue
        if menu == "e":
            from settings import settings_menu
            settings_menu()
            continue
        if menu == "?":
            from tutorial import tutorial_menu
            tutorial_menu()
            continue
        if menu == "8":
            Highscores.display()
            input("\n  [Enter] zum Fortfahren...")
            continue
        if menu == "9":
            from profiles import ProfileManager
            pname = input("  Spielername: ").strip()
            if pname:
                ProfileManager.display_profile(pname)
            input("\n  [Enter] zum Fortfahren...")
            continue
        if menu == "7":
            from leaderboard import leaderboard_menu
            leaderboard_menu()
            continue
        if menu == "6":
            from replay import replay_menu
            replay_menu()
            continue
        if menu == "5":
            from daily import daily_menu
            daily_menu()
            print(Color.info("\nDanke fürs Spielen!"))
            return
        if menu == "4":
            from training import training_menu
            training_menu()
            print(Color.info("\nDanke fürs Trainieren!"))
            return
        if menu == "3":
            from minigames import minigames_menu
            minigames_menu()
            print(Color.info("\nDanke fürs Spielen!"))
            return
        if menu == "2":
            from cricket import play_cricket
            cricket_players = setup_players(is_cricket=True)
            play_cricket(cricket_players)
            print(Color.info("\nDanke fürs Spielen!"))
            return
        if menu == "1":
            break
        print("  Bitte 0-9 wählen.")

    start_score = choose_game_mode()
    best_of = choose_tournament_mode()
    players = setup_players(start_score=start_score)
    board = DartBoard()
    sets_to_win = (best_of // 2) + 1

    from profiles import ProfileManager
    from replay import ReplayRecorder
    from commentary import Commentary

    commentary_on = Commentary.toggle_prompt()
    comm = Commentary(enabled=commentary_on)

    game_mode = f"Best of {best_of}" if best_of > 1 else "Einzelspiel"
    recorder = ReplayRecorder([p.name for p in players], game_mode, start_score)
    has_hard_cpu = any(isinstance(p, CPUPlayer) and p.difficulty == "schwer" for p in players)

    if best_of == 1:
        print(Color.success(f"\nSpiel startet! Modus: {start_score} - Ziel: Von {start_score} auf genau 0."))
        winner = play_leg(players, board, start_score, recorder=recorder, commentary=comm)
        if not winner.is_cpu:
            Highscores.add_entry(
                winner.name,
                winner.darts_thrown,
                winner.stats.average_per_round,
            )
            print(Color.success("  Ergebnis in Highscores gespeichert!"))
    else:
        set_wins = {p.name: 0 for p in players}
        print(Color.success(f"\nTurnier startet! Best of {best_of} | Modus: {start_score}"))
        print(Color.info(f"  Erster Spieler mit {sets_to_win} Sets gewinnt!"))

        set_num = 0
        tournament_over = False
        while not tournament_over:
            set_num += 1
            leg_label = f"Set {set_num} / Best of {best_of}"
            winner = play_leg(players, board, start_score, leg_label, recorder=recorder, commentary=comm)
            set_wins[winner.name] += 1
            display_set_standings(set_wins, players, sets_to_win)

            if set_wins[winner.name] >= sets_to_win:
                print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
                print(f"  {winner.name} GEWINNT DAS TURNIER!")
                print(f"  Sets: {set_wins[winner.name]}-{max(v for k, v in set_wins.items() if k != winner.name)}")
                print(f"{'*' * 44}{Color.RESET}")
                if not winner.is_cpu:
                    Highscores.add_entry(
                        winner.name,
                        winner.darts_thrown,
                        winner.stats.average_per_round,
                    )
                    print(Color.success("  Ergebnis in Highscores gespeichert!"))
                tournament_over = True
            else:
                input(Color.info("\n  [Enter] für nächstes Set..."))

    for player in players:
        if not player.is_cpu:
            is_winner = (player.score == 0) if best_of == 1 else (player.name == winner.name)
            profile, xp_earned, leveled_up, unlocked = ProfileManager.update_after_game(
                player.name,
                player.stats,
                won=is_winner,
                busts=player.stats.busts,
                darts=player.darts_thrown,
                vs_hard_cpu=has_hard_cpu,
                tournament_bo7=(best_of == 7),
            )
            print(f"\n  {Color.info(f'{player.name}:')} +{xp_earned} XP")
            if leveled_up:
                print(f"  {Color.BOLD}{Color.YELLOW}  LEVEL UP! Level {profile.level} - {profile.title}{Color.RESET}")
            for title, desc in unlocked:
                print(f"  {Color.BOLD}{Color.GREEN}  ★ Achievement: {title}{Color.RESET} - {desc}")

    from leaderboard import Leaderboard
    human_players = [p for p in players if not p.is_cpu]
    if len(human_players) >= 2:
        for p in human_players:
            if p.name != winner.name:
                w_change, l_change = Leaderboard.record_match(winner.name, p.name)
                print(f"\n  {Color.info('Elo-Update:')}")
                print(f"    {winner.name}: {Color.success(f'+{w_change}')}")
                print(f"    {p.name}: {Color.warning(str(l_change))}")

    replay_file = recorder.save()
    print(Color.muted(f"\n  Replay gespeichert: {replay_file}"))

    from match_history import MatchHistory
    player_data = []
    for p in players:
        pd = {
            "name": p.name,
            "darts": p.darts_thrown,
            "is_cpu": p.is_cpu,
            "avg_round": p.stats.average_per_round,
            "bullseyes": p.stats.bullseyes,
            "triples": p.stats.triples,
            "highest_round": p.stats.highest_round,
        }
        player_data.append(pd)
    MatchHistory.record_match(
        match_type="Standard",
        players=player_data,
        winner_name=winner.name,
        start_score=start_score,
        game_mode=game_mode,
    )

    print("\n" + Color.muted("=" * 40))
    print(Color.title(f"{'ENDSTATISTIKEN':^40}"))
    print(Color.muted("=" * 40))
    for player in players:
        player.stats.display(player.name)

    print(Color.info("\nDanke fürs Spielen!"))


if __name__ == "__main__":
    main()
