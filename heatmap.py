#!/usr/bin/env python3
"""Wurf-Heatmap: Zeigt die Verteilung der Dart-Treffer visuell an."""

import json
import os
from dart_game import Color, DartBoard

HEATMAP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heatmap_data.json")

SEGMENTS = DartBoard.SEGMENTS
HEAT_COLORS = [
    (0, Color.GRAY),
    (1, Color.BLUE),
    (3, Color.CYAN),
    (6, Color.GREEN),
    (10, Color.YELLOW),
    (20, Color.RED),
    (40, f"{Color.BOLD}{Color.RED}"),
]

HEAT_BLOCKS = " ░▒▓█"


class HeatmapTracker:
    @staticmethod
    def load():
        if os.path.exists(HEATMAP_FILE):
            try:
                with open(HEATMAP_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    @staticmethod
    def save(data):
        with open(HEATMAP_FILE, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def get_player(cls, name):
        data = cls.load()
        if name not in data:
            data[name] = {
                "singles": {str(i): 0 for i in range(1, 21)},
                "doubles": {str(i): 0 for i in range(1, 21)},
                "triples": {str(i): 0 for i in range(1, 21)},
                "bull": 0,
                "bullseye": 0,
                "miss": 0,
                "total": 0,
            }
            cls.save(data)
        return data[name]

    @classmethod
    def record_throw(cls, name, result, points):
        data = cls.load()
        if name not in data:
            cls.get_player(name)
            data = cls.load()

        p = data[name]
        p["total"] += 1

        if result == "Bullseye":
            p["bullseye"] += 1
        elif result == "Bull":
            p["bull"] += 1
        elif result == "Miss":
            p["miss"] += 1
        elif result.startswith("Triple "):
            num = result.split(" ")[1]
            p["triples"][num] = p["triples"].get(num, 0) + 1
        elif result.startswith("Double "):
            num = result.split(" ")[1]
            p["doubles"][num] = p["doubles"].get(num, 0) + 1
        else:
            num = result.strip()
            if num.isdigit():
                p["singles"][num] = p["singles"].get(num, 0) + 1

        cls.save(data)

    @classmethod
    def display_segment_heatmap(cls, name):
        p = cls.get_player(name)
        if p["total"] == 0:
            print(f"  {Color.muted('Noch keine Würfe aufgezeichnet.')}")
            return

        print(f"\n{Color.muted('═' * 60)}")
        print(Color.title(f"{'SEGMENT-HEATMAP':^60}"))
        print(f"{Color.muted('═' * 60)}")
        print(f"  Spieler: {Color.BOLD}{name}{Color.RESET} ({p['total']} Würfe)")

        all_counts = []
        for seg in range(1, 21):
            s = str(seg)
            total = p["singles"].get(s, 0) + p["doubles"].get(s, 0) + p["triples"].get(s, 0)
            all_counts.append((seg, total))

        max_count = max(c for _, c in all_counts) if all_counts else 1
        if max_count == 0:
            max_count = 1

        print(f"\n  {Color.info('Treffer pro Segment:')}")
        print(f"  {'Seg':>4} {'Treffer':>8} {'Verteilung':<30} {'%':>5}")
        print(f"  {Color.muted('─' * 54)}")

        sorted_counts = sorted(all_counts, key=lambda x: x[1], reverse=True)
        for seg, count in sorted_counts:
            pct = (count / p["total"]) * 100 if p["total"] > 0 else 0
            bar_len = int((count / max_count) * 25)
            color = _get_heat_color(count)
            bar = "█" * bar_len
            print(f"  {seg:>4} {count:>8} {color}{bar}{Color.RESET} {pct:>5.1f}%")

        print(f"\n  {Color.info('Spezialfelder:')}")
        print(f"    Bullseye:  {Color.YELLOW}{p['bullseye']}{Color.RESET}")
        print(f"    Bull:      {Color.GREEN}{p['bull']}{Color.RESET}")
        print(f"    Miss:      {Color.GRAY}{p['miss']}{Color.RESET}")

        print(f"{Color.muted('═' * 60)}")

    @classmethod
    def display_ring_heatmap(cls, name):
        p = cls.get_player(name)
        if p["total"] == 0:
            print(f"  {Color.muted('Noch keine Würfe aufgezeichnet.')}")
            return

        total_singles = sum(p["singles"].values())
        total_doubles = sum(p["doubles"].values())
        total_triples = sum(p["triples"].values())
        total_bull = p["bull"]
        total_bullseye = p["bullseye"]
        total_miss = p["miss"]
        total = p["total"]

        rings = [
            ("Bullseye", total_bullseye, Color.YELLOW),
            ("Bull", total_bull, Color.GREEN),
            ("Triple", total_triples, Color.RED),
            ("Single", total_singles, Color.WHITE),
            ("Double", total_doubles, Color.CYAN),
            ("Miss", total_miss, Color.GRAY),
        ]

        print(f"\n{Color.muted('═' * 50)}")
        print(Color.title(f"{'RING-VERTEILUNG':^50}"))
        print(f"{Color.muted('═' * 50)}")
        print(f"  Spieler: {Color.BOLD}{name}{Color.RESET} ({total} Würfe)")

        max_ring = max(c for _, c, _ in rings) if rings else 1
        if max_ring == 0:
            max_ring = 1

        for ring_name, count, color in rings:
            pct = (count / total) * 100 if total > 0 else 0
            bar_len = int((count / max_ring) * 25)
            bar = "█" * bar_len
            print(f"  {ring_name:<10} {color}{bar:<25}{Color.RESET} "
                  f"{count:>5} ({pct:.1f}%)")

        print(f"{Color.muted('═' * 50)}")

    @classmethod
    def display_board_visual(cls, name):
        p = cls.get_player(name)
        if p["total"] == 0:
            print(f"  {Color.muted('Noch keine Würfe aufgezeichnet.')}")
            return

        print(f"\n{Color.muted('═' * 50)}")
        print(Color.title(f"{'BOARD-ÜBERSICHT':^50}"))
        print(f"{Color.muted('═' * 50)}")
        print(f"  Spieler: {Color.BOLD}{name}{Color.RESET}")

        print(f"\n  Board-Reihenfolge (im Uhrzeigersinn):")
        print(f"  {'':>4} {'S':>4} {'D':>4} {'T':>4} {'Ges':>5}")
        print(f"  {Color.muted('─' * 25)}")

        for seg in SEGMENTS:
            s = str(seg)
            si = p["singles"].get(s, 0)
            di = p["doubles"].get(s, 0)
            ti = p["triples"].get(s, 0)
            total = si + di + ti
            color = _get_heat_color(total)
            print(f"  {color}{seg:>4}{Color.RESET} {si:>4} {di:>4} {ti:>4} {Color.BOLD}{total:>5}{Color.RESET}")

        be = p["bullseye"]
        bu = p["bull"]
        mi = p["miss"]
        print(f"  {Color.muted('─' * 25)}")
        print(f"  {Color.YELLOW}{'Bull':>4}{Color.RESET} {bu:>4} {be:>4} {'':>4} {Color.BOLD}{bu + be:>5}{Color.RESET}")
        print(f"  {Color.GRAY}{'Miss':>4}{Color.RESET} {mi:>4}")

        print(f"{Color.muted('═' * 50)}")


def _get_heat_color(count):
    color = Color.GRAY
    for threshold, c in HEAT_COLORS:
        if count >= threshold:
            color = c
    return color


def heatmap_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'WURF-HEATMAP':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Segment-Heatmap")
    print("    2) Ring-Verteilung")
    print("    3) Board-Übersicht")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice in ("1", "2", "3"):
            name = input("  Spielername: ").strip()
            if not name:
                print("  Bitte einen Namen eingeben.")
                continue
            if choice == "1":
                HeatmapTracker.display_segment_heatmap(name)
            elif choice == "2":
                HeatmapTracker.display_ring_heatmap(name)
            elif choice == "3":
                HeatmapTracker.display_board_visual(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
