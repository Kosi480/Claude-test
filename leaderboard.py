#!/usr/bin/env python3
"""Leaderboard mit Elo-Rating-System."""

import json
import os
from datetime import datetime
from dart_game import Color

LEADERBOARD_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leaderboard.json")

RANKS = [
    (2000, "Grandmaster", Color.YELLOW),
    (1700, "Master", Color.RED),
    (1400, "Diamant", Color.CYAN),
    (1200, "Gold", Color.YELLOW),
    (1000, "Silber", Color.WHITE),
    (800, "Bronze", Color.GREEN),
    (0, "Eisen", Color.GRAY),
]

DEFAULT_ELO = 1000
K_FACTOR = 32


def get_rank(elo):
    for threshold, name, color in RANKS:
        if elo >= threshold:
            return name, color
    return "Eisen", Color.GRAY


def calculate_elo(winner_elo, loser_elo):
    expected_win = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    expected_lose = 1 - expected_win
    new_winner = winner_elo + K_FACTOR * (1 - expected_win)
    new_loser = loser_elo + K_FACTOR * (0 - expected_lose)
    return round(new_winner), max(round(new_loser), 100)


class Leaderboard:
    @staticmethod
    def load():
        if os.path.exists(LEADERBOARD_FILE):
            try:
                with open(LEADERBOARD_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    @staticmethod
    def save(data):
        with open(LEADERBOARD_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @classmethod
    def get_player(cls, name):
        data = cls.load()
        if name not in data:
            data[name] = {
                "elo": DEFAULT_ELO,
                "peak_elo": DEFAULT_ELO,
                "wins": 0,
                "losses": 0,
                "history": [],
                "joined": datetime.now().strftime("%Y-%m-%d"),
            }
            cls.save(data)
        return data[name]

    @classmethod
    def record_match(cls, winner_name, loser_name):
        data = cls.load()

        for name in (winner_name, loser_name):
            if name not in data:
                data[name] = {
                    "elo": DEFAULT_ELO,
                    "peak_elo": DEFAULT_ELO,
                    "wins": 0,
                    "losses": 0,
                    "history": [],
                    "joined": datetime.now().strftime("%Y-%m-%d"),
                }

        old_w = data[winner_name]["elo"]
        old_l = data[loser_name]["elo"]
        new_w, new_l = calculate_elo(old_w, old_l)

        data[winner_name]["elo"] = new_w
        data[winner_name]["wins"] += 1
        data[winner_name]["peak_elo"] = max(data[winner_name]["peak_elo"], new_w)
        data[winner_name]["history"].append({
            "vs": loser_name,
            "result": "W",
            "elo_change": new_w - old_w,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        })
        data[winner_name]["history"] = data[winner_name]["history"][-20:]

        data[loser_name]["elo"] = new_l
        data[loser_name]["losses"] += 1
        data[loser_name]["history"].append({
            "vs": winner_name,
            "result": "L",
            "elo_change": new_l - old_l,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        })
        data[loser_name]["history"] = data[loser_name]["history"][-20:]

        cls.save(data)
        return new_w - old_w, new_l - old_l

    @classmethod
    def display(cls):
        data = cls.load()
        if not data:
            print(f"\n  {Color.muted('Noch keine Spieler im Leaderboard.')}")
            print(Color.muted("  Spiele ein Spiel gegen andere, um einzusteigen!"))
            return

        sorted_players = sorted(data.items(), key=lambda x: x[1]["elo"], reverse=True)

        print(f"\n{Color.muted('═' * 58)}")
        print(Color.title(f"{'LEADERBOARD':^58}"))
        print(Color.muted("═" * 58))
        print(f"  {'#':<4} {'Name':<16} {'Elo':>6} {'Rang':<14} {'W/L':>7} {'WR':>5}")
        print(f"  {Color.muted('─' * 54)}")

        for i, (name, info) in enumerate(sorted_players[:15], 1):
            elo = info["elo"]
            rank_name, rank_color = get_rank(elo)
            wins = info["wins"]
            losses = info["losses"]
            total = wins + losses
            wr = f"{(wins / total * 100):.0f}%" if total > 0 else "-"
            wl = f"{wins}/{losses}"

            medal = {1: "👑", 2: "🥈", 3: "🥉"}.get(i, "  ")

            print(f"  {medal}{i:<3} {name:<16} "
                  f"{Color.BOLD}{elo:>6}{Color.RESET} "
                  f"{rank_color}{rank_name:<14}{Color.RESET} "
                  f"{wl:>7} {wr:>5}")

        print(f"{Color.muted('═' * 58)}")

    @classmethod
    def display_player_detail(cls, name):
        data = cls.load()
        if name not in data:
            print(f"  Spieler '{name}' nicht im Leaderboard.")
            return

        info = data[name]
        elo = info["elo"]
        rank_name, rank_color = get_rank(elo)
        wins = info["wins"]
        losses = info["losses"]
        total = wins + losses
        wr = f"{(wins / total * 100):.0f}%" if total > 0 else "-"

        print(f"\n{Color.muted('─' * 44)}")
        print(f"  {Color.BOLD}{name}{Color.RESET}")
        print(f"  Elo:      {Color.BOLD}{elo}{Color.RESET} (Peak: {info['peak_elo']})")
        print(f"  Rang:     {rank_color}{Color.BOLD}{rank_name}{Color.RESET}")
        print(f"  Bilanz:   {wins}W / {losses}L ({wr})")
        print(f"  Dabei seit: {info.get('joined', '?')}")

        next_rank = None
        for threshold, rname, _ in RANKS:
            if threshold > elo:
                next_rank = (threshold, rname)
            else:
                break
        if next_rank:
            diff = next_rank[0] - elo
            print(f"  Nächster Rang: {next_rank[1]} (noch {diff} Elo)")

        if info["history"]:
            print(f"\n  {Color.info('Letzte Spiele:')}")
            for match in reversed(info["history"][-5:]):
                if match["result"] == "W":
                    symbol = Color.success("W")
                    change = f"+{match['elo_change']}"
                else:
                    symbol = Color.warning("L")
                    change = str(match["elo_change"])
                print(f"    {symbol} vs {match['vs']:<16} {change:>5} Elo  {Color.muted(match['date'])}")

        print(Color.muted("─" * 44))


def leaderboard_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'LEADERBOARD':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Rangliste anzeigen")
    print("    2) Spieler-Details")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            Leaderboard.display()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            name = input("  Spielername: ").strip()
            if name:
                Leaderboard.display_player_detail(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            return
        print("  Bitte 1-3 wählen.")
