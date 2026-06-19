#!/usr/bin/env python3
"""Saison-System mit periodischen Ranglisten und Belohnungen."""

import json
import os
from datetime import datetime, date
from dart_game import Color

SEASONS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seasons.json")
SEASON_LENGTH_DAYS = 30

SEASON_REWARDS = {
    1: {"title": "Saisonsieger", "coins": 1000, "xp": 500},
    2: {"title": "Vizemeister", "coins": 500, "xp": 300},
    3: {"title": "Bronzemedaillist", "coins": 250, "xp": 200},
}

SEASON_TIERS = [
    (100, "Diamant", Color.CYAN),
    (75, "Platin", Color.WHITE),
    (50, "Gold", Color.YELLOW),
    (25, "Silber", Color.WHITE),
    (0, "Bronze", Color.GREEN),
]


def get_current_season_number():
    base = date(2024, 1, 1).toordinal()
    today = date.today().toordinal()
    return ((today - base) // SEASON_LENGTH_DAYS) + 1


def get_season_dates(season_num):
    base = date(2024, 1, 1).toordinal()
    start_ord = base + (season_num - 1) * SEASON_LENGTH_DAYS
    end_ord = start_ord + SEASON_LENGTH_DAYS - 1
    start = date.fromordinal(start_ord)
    end = date.fromordinal(end_ord)
    return start, end


def days_remaining():
    current = get_current_season_number()
    _, end = get_season_dates(current)
    return (end - date.today()).days


def get_tier(points):
    for threshold, name, color in SEASON_TIERS:
        if points >= threshold:
            return name, color
    return "Bronze", Color.GREEN


class SeasonManager:
    @staticmethod
    def load():
        if os.path.exists(SEASONS_FILE):
            try:
                with open(SEASONS_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {"current_season": 0, "players": {}, "hall_of_fame": []}

    @staticmethod
    def save(data):
        with open(SEASONS_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @classmethod
    def ensure_current_season(cls):
        data = cls.load()
        current = get_current_season_number()

        if data["current_season"] != current:
            if data["current_season"] > 0 and data["players"]:
                cls._archive_season(data)

            data["current_season"] = current
            data["players"] = {}
            cls.save(data)

        return data

    @classmethod
    def _archive_season(cls, data):
        season_num = data["current_season"]
        start, end = get_season_dates(season_num)

        sorted_players = sorted(
            data["players"].items(),
            key=lambda x: x[1]["points"],
            reverse=True,
        )

        archive = {
            "season": season_num,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "top_players": [],
        }

        for i, (name, info) in enumerate(sorted_players[:10]):
            archive["top_players"].append({
                "rank": i + 1,
                "name": name,
                "points": info["points"],
                "wins": info["wins"],
                "games": info["games"],
            })

        data["hall_of_fame"].append(archive)
        data["hall_of_fame"] = data["hall_of_fame"][-12:]

    @classmethod
    def record_game(cls, player_name, won=False, points_earned=0):
        data = cls.ensure_current_season()

        if player_name not in data["players"]:
            data["players"][player_name] = {
                "points": 0,
                "wins": 0,
                "games": 0,
                "joined": datetime.now().strftime("%Y-%m-%d"),
            }

        p = data["players"][player_name]
        p["games"] += 1
        if won:
            p["wins"] += 1
            p["points"] += 10 + points_earned
        else:
            p["points"] += max(2, points_earned)

        cls.save(data)
        return p

    @classmethod
    def display_season(cls):
        data = cls.ensure_current_season()
        current = get_current_season_number()
        start, end = get_season_dates(current)
        remaining = days_remaining()

        print(f"\n{Color.muted('═' * 56)}")
        print(Color.title(f"{'SAISON ' + str(current):^56}"))
        print(f"{Color.muted('═' * 56)}")
        print(f"  {start.strftime('%d.%m.%Y')} - {end.strftime('%d.%m.%Y')}")
        print(f"  {Color.info(f'Noch {remaining} Tage verbleibend')}")

        if not data["players"]:
            print(f"\n  {Color.muted('Noch keine Spieler in dieser Saison.')}")
            print(f"  {Color.muted('Spiele ein Spiel, um teilzunehmen!')}")
            print(f"{Color.muted('═' * 56)}")
            return

        sorted_players = sorted(
            data["players"].items(),
            key=lambda x: x[1]["points"],
            reverse=True,
        )

        print(f"\n  {'#':<4} {'Name':<16} {'Punkte':>8} {'Tier':<10} {'W/G':>7}")
        print(f"  {Color.muted('─' * 50)}")

        for i, (name, info) in enumerate(sorted_players[:15], 1):
            pts = info["points"]
            tier_name, tier_color = get_tier(pts)
            wins = info["wins"]
            games = info["games"]
            wg = f"{wins}/{games}"

            medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
            print(f"  {medal}{i:<3} {name:<16} {Color.BOLD}{pts:>8}{Color.RESET} "
                  f"{tier_color}{tier_name:<10}{Color.RESET} {wg:>7}")

        print(f"\n  {Color.muted('Belohnungen am Saisonende:')}")
        for rank, reward in SEASON_REWARDS.items():
            print(f"    {rank}. Platz: {Color.YELLOW}{reward['coins']} 🪙{Color.RESET} + "
                  f"{Color.GREEN}{reward['xp']} XP{Color.RESET} "
                  f"({reward['title']})")

        print(f"{Color.muted('═' * 56)}")

    @classmethod
    def display_hall_of_fame(cls):
        data = cls.load()
        hof = data.get("hall_of_fame", [])

        print(f"\n{Color.muted('═' * 56)}")
        print(Color.title(f"{'HALL OF FAME':^56}"))
        print(f"{Color.muted('═' * 56)}")

        if not hof:
            print(f"  {Color.muted('Noch keine abgeschlossenen Saisons.')}")
            print(f"{Color.muted('═' * 56)}")
            return

        for entry in reversed(hof[-5:]):
            season = entry["season"]
            start = entry.get("start", "?")
            end = entry.get("end", "?")
            print(f"\n  {Color.BOLD}Saison {season}{Color.RESET} "
                  f"{Color.muted(f'({start} bis {end})')}")

            for p in entry["top_players"][:3]:
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(p["rank"], "  ")
                print(f"    {medal} {p['name']:<16} {p['points']:>6} Punkte "
                      f"({p['wins']}W/{p['games']}G)")

        print(f"{Color.muted('═' * 56)}")

    @classmethod
    def display_player_season(cls, name):
        data = cls.ensure_current_season()
        current = get_current_season_number()

        if name not in data["players"]:
            print(f"  {Color.muted(f'{name} hat in Saison {current} noch nicht gespielt.')}")
            return

        info = data["players"][name]
        pts = info["points"]
        tier_name, tier_color = get_tier(pts)

        sorted_all = sorted(
            data["players"].items(),
            key=lambda x: x[1]["points"],
            reverse=True,
        )
        rank = next(i for i, (n, _) in enumerate(sorted_all, 1) if n == name)

        print(f"\n{Color.muted('─' * 44)}")
        print(f"  {Color.BOLD}{name}{Color.RESET} - Saison {current}")
        print(f"  {Color.muted('─' * 40)}")
        print(f"    Rang:     #{rank} von {len(data['players'])}")
        print(f"    Punkte:   {Color.BOLD}{pts}{Color.RESET}")
        print(f"    Tier:     {tier_color}{Color.BOLD}{tier_name}{Color.RESET}")
        print(f"    Spiele:   {info['games']}")
        print(f"    Siege:    {info['wins']}")

        next_tier = None
        for threshold, tname, _ in SEASON_TIERS:
            if threshold > pts:
                next_tier = (threshold, tname)
            else:
                break
        if next_tier:
            diff = next_tier[0] - pts
            print(f"    Nächster Tier: {next_tier[1]} (noch {diff} Punkte)")

        print(f"{Color.muted('─' * 44)}")


def seasons_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'SAISON-SYSTEM':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Aktuelle Saison-Rangliste")
    print("    2) Mein Saison-Profil")
    print("    3) Hall of Fame")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            SeasonManager.display_season()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            name = input("  Spielername: ").strip()
            if name:
                SeasonManager.display_player_season(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            SeasonManager.display_hall_of_fame()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
