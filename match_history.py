#!/usr/bin/env python3
"""Spielverlauf: Speichert und zeigt alle absolvierten Partien."""

import json
import os
from datetime import datetime
from dart_game import Color

HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "match_history.json")
MAX_HISTORY = 100


class MatchHistory:
    @staticmethod
    def load():
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    @staticmethod
    def save(history):
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

    @classmethod
    def record_match(cls, match_type, players, winner_name, start_score,
                     game_mode="", stats=None):
        history = cls.load()

        entry = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "type": match_type,
            "mode": game_mode,
            "start_score": start_score,
            "players": [],
            "winner": winner_name,
        }

        for p in players:
            player_data = {
                "name": p.get("name", "?"),
                "darts": p.get("darts", 0),
                "is_cpu": p.get("is_cpu", False),
            }
            if "avg_round" in p:
                player_data["avg_round"] = round(p["avg_round"], 1)
            if "bullseyes" in p:
                player_data["bullseyes"] = p["bullseyes"]
            if "triples" in p:
                player_data["triples"] = p["triples"]
            if "highest_round" in p:
                player_data["highest_round"] = p["highest_round"]
            entry["players"].append(player_data)

        history.append(entry)
        history = history[-MAX_HISTORY:]
        cls.save(history)
        return entry

    @classmethod
    def get_player_history(cls, name, limit=20):
        history = cls.load()
        matches = []
        for match in reversed(history):
            player_names = [p["name"] for p in match["players"]]
            if name in player_names:
                matches.append(match)
                if len(matches) >= limit:
                    break
        return matches

    @classmethod
    def get_stats_for_player(cls, name):
        history = cls.load()
        stats = {
            "total": 0,
            "wins": 0,
            "losses": 0,
            "avg_darts": [],
            "opponents": {},
            "modes_played": {},
            "best_avg": None,
            "worst_avg": None,
        }

        for match in history:
            player_names = [p["name"] for p in match["players"]]
            if name not in player_names:
                continue

            stats["total"] += 1
            if match["winner"] == name:
                stats["wins"] += 1
            else:
                stats["losses"] += 1

            mode = match.get("mode", match.get("type", "?"))
            stats["modes_played"][mode] = stats["modes_played"].get(mode, 0) + 1

            for p in match["players"]:
                if p["name"] == name:
                    if "darts" in p and p["darts"] > 0:
                        stats["avg_darts"].append(p["darts"])
                    if "avg_round" in p:
                        if stats["best_avg"] is None or p["avg_round"] > stats["best_avg"]:
                            stats["best_avg"] = p["avg_round"]
                        if stats["worst_avg"] is None or p["avg_round"] < stats["worst_avg"]:
                            stats["worst_avg"] = p["avg_round"]
                else:
                    opp = p["name"]
                    if opp not in stats["opponents"]:
                        stats["opponents"][opp] = {"wins": 0, "losses": 0}
                    if match["winner"] == name:
                        stats["opponents"][opp]["wins"] += 1
                    else:
                        stats["opponents"][opp]["losses"] += 1

        return stats

    @classmethod
    def display_history(cls, limit=15):
        history = cls.load()
        if not history:
            print(f"\n  {Color.muted('Noch keine Spiele aufgezeichnet.')}")
            return

        print(f"\n{Color.muted('═' * 60)}")
        print(Color.title(f"{'SPIELVERLAUF':^60}"))
        print(f"{Color.muted('═' * 60)}")
        print(f"  {'Datum':<18} {'Modus':<14} {'Spieler':<18} {'Gewinner':>8}")
        print(f"  {Color.muted('─' * 56)}")

        for match in reversed(history[-limit:]):
            date = match["date"]
            mode = match.get("mode", match.get("type", "?"))[:12]
            players = ", ".join(p["name"][:8] for p in match["players"])
            winner = match["winner"][:8]

            print(f"  {date:<18} {mode:<14} {players:<18} "
                  f"{Color.BOLD}{winner:>8}{Color.RESET}")

        total = len(history)
        print(f"\n  {Color.muted(f'Gesamt: {total} Spiele aufgezeichnet')}")
        print(f"{Color.muted('═' * 60)}")

    @classmethod
    def display_player_summary(cls, name):
        stats = cls.get_stats_for_player(name)
        if stats["total"] == 0:
            print(f"\n  {Color.muted(f'Keine Spiele für {name} gefunden.')}")
            return

        print(f"\n{Color.muted('═' * 50)}")
        print(Color.title(f"{'MATCH-STATISTIK':^50}"))
        print(f"{Color.muted('═' * 50)}")
        print(f"  Spieler: {Color.BOLD}{name}{Color.RESET}")
        print(f"  {Color.muted('─' * 46)}")

        wr = (stats["wins"] / stats["total"] * 100) if stats["total"] > 0 else 0
        print(f"    Spiele:       {stats['total']}")
        print(f"    Siege:        {Color.success(str(stats['wins']))}")
        print(f"    Niederlagen:  {Color.warning(str(stats['losses']))}")
        print(f"    Siegrate:     {Color.BOLD}{wr:.0f}%{Color.RESET}")

        if stats["avg_darts"]:
            avg = sum(stats["avg_darts"]) / len(stats["avg_darts"])
            best = min(stats["avg_darts"])
            print(f"    Ø Darts/Spiel: {avg:.1f}")
            print(f"    Bester Wert:   {Color.success(str(best))} Darts")

        if stats["best_avg"] is not None:
            best_avg = f"{stats['best_avg']:.1f}"
            print(f"    Beste Ø/Runde: {Color.success(best_avg)}")
        if stats["worst_avg"] is not None:
            print(f"    Schlechteste:  {stats['worst_avg']:.1f}")

        if stats["modes_played"]:
            print(f"\n  {Color.info('Gespielte Modi:')}")
            for mode, count in sorted(stats["modes_played"].items(),
                                      key=lambda x: x[1], reverse=True):
                print(f"    {mode:<20} {count}x")

        if stats["opponents"]:
            print(f"\n  {Color.info('Gegner-Bilanz:')}")
            sorted_opps = sorted(stats["opponents"].items(),
                                 key=lambda x: x[1]["wins"] + x[1]["losses"],
                                 reverse=True)
            for opp, record in sorted_opps[:5]:
                w, l = record["wins"], record["losses"]
                print(f"    vs {opp:<16} {Color.success(f'{w}W')} / {Color.warning(f'{l}L')}")

        matches = cls.get_player_history(name, 5)
        if matches:
            print(f"\n  {Color.info('Letzte Spiele:')}")
            for m in matches:
                won = "W" if m["winner"] == name else "L"
                color = Color.success if won == "W" else Color.warning
                opponents = [p["name"] for p in m["players"] if p["name"] != name]
                opp_str = ", ".join(opponents) if opponents else "Solo"
                print(f"    {color(won)} {m['date']}  vs {opp_str}  ({m.get('mode', '?')})")

        print(f"{Color.muted('═' * 50)}")


def history_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'SPIELVERLAUF':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Alle Spiele anzeigen")
    print("    2) Spieler-Zusammenfassung")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()
        if choice == "1":
            MatchHistory.display_history()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            name = input("  Spielername: ").strip()
            if name:
                MatchHistory.display_player_summary(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            return
        print("  Bitte 1-3 wählen.")
