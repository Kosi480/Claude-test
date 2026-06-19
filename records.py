#!/usr/bin/env python3
"""Streaks & Records: Persönliche Bestleistungen und Serien."""

import json
import os
from datetime import datetime
from dart_game import Color

RECORDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "records_data.json")

MILESTONES = [
    {"key": "games_10", "label": "10 Spiele", "check": lambda r: r.get("total_games", 0) >= 10},
    {"key": "games_50", "label": "50 Spiele", "check": lambda r: r.get("total_games", 0) >= 50},
    {"key": "games_100", "label": "100 Spiele", "check": lambda r: r.get("total_games", 0) >= 100},
    {"key": "wins_10", "label": "10 Siege", "check": lambda r: r.get("total_wins", 0) >= 10},
    {"key": "wins_50", "label": "50 Siege", "check": lambda r: r.get("total_wins", 0) >= 50},
    {"key": "streak_5", "label": "5er Siegesserie", "check": lambda r: r.get("best_win_streak", 0) >= 5},
    {"key": "streak_10", "label": "10er Siegesserie", "check": lambda r: r.get("best_win_streak", 0) >= 10},
    {"key": "avg_60", "label": "Ø 60+ in einem Spiel", "check": lambda r: r.get("best_avg", 0) >= 60},
    {"key": "avg_80", "label": "Ø 80+ in einem Spiel", "check": lambda r: r.get("best_avg", 0) >= 80},
    {"key": "darts_15", "label": "15-Dart-Finish", "check": lambda r: r.get("best_darts", 999) <= 15},
    {"key": "bullseyes_100", "label": "100 Bullseyes", "check": lambda r: r.get("total_bullseyes", 0) >= 100},
    {"key": "triples_500", "label": "500 Triples", "check": lambda r: r.get("total_triples", 0) >= 500},
    {"key": "daily_7", "label": "7 Tage in Folge gespielt", "check": lambda r: r.get("best_daily_streak", 0) >= 7},
]


def load_records():
    if os.path.exists(RECORDS_FILE):
        try:
            with open(RECORDS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_records(data):
    try:
        with open(RECORDS_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except (IOError, OSError):
        pass


def get_player_records(player_name):
    data = load_records()
    if player_name not in data:
        data[player_name] = {
            "total_games": 0,
            "total_wins": 0,
            "total_losses": 0,
            "current_win_streak": 0,
            "best_win_streak": 0,
            "current_loss_streak": 0,
            "worst_loss_streak": 0,
            "best_avg": 0.0,
            "best_darts": 999,
            "worst_darts": 0,
            "highest_round": 0,
            "total_180s": 0,
            "total_bullseyes": 0,
            "total_triples": 0,
            "total_doubles": 0,
            "total_busts": 0,
            "best_daily_streak": 0,
            "current_daily_streak": 0,
            "last_play_date": "",
            "milestones": [],
            "history": [],
        }
    return data, data[player_name]


def record_game(player_name, won, darts, avg, bullseyes=0, triples=0, doubles=0,
                highest_round=0, busts=0, is_180=False):
    data, rec = get_player_records(player_name)

    rec["total_games"] += 1
    if won:
        rec["total_wins"] += 1
        rec["current_win_streak"] += 1
        rec["current_loss_streak"] = 0
        rec["best_win_streak"] = max(rec["best_win_streak"], rec["current_win_streak"])
    else:
        rec["total_losses"] += 1
        rec["current_loss_streak"] += 1
        rec["current_win_streak"] = 0
        rec["worst_loss_streak"] = max(rec["worst_loss_streak"], rec["current_loss_streak"])

    if avg > rec["best_avg"]:
        rec["best_avg"] = round(avg, 1)
    if won and darts < rec["best_darts"]:
        rec["best_darts"] = darts
    if darts > rec["worst_darts"]:
        rec["worst_darts"] = darts
    if highest_round > rec["highest_round"]:
        rec["highest_round"] = highest_round

    rec["total_bullseyes"] += bullseyes
    rec["total_triples"] += triples
    rec["total_doubles"] += doubles
    rec["total_busts"] += busts
    if is_180:
        rec["total_180s"] += 1

    today = datetime.now().strftime("%Y-%m-%d")
    if rec["last_play_date"] == today:
        pass
    elif rec["last_play_date"]:
        from datetime import timedelta
        try:
            last = datetime.strptime(rec["last_play_date"], "%Y-%m-%d")
            if (datetime.now() - last).days == 1:
                rec["current_daily_streak"] += 1
            else:
                rec["current_daily_streak"] = 1
        except ValueError:
            rec["current_daily_streak"] = 1
    else:
        rec["current_daily_streak"] = 1

    rec["last_play_date"] = today
    rec["best_daily_streak"] = max(rec["best_daily_streak"], rec["current_daily_streak"])

    new_milestones = check_milestones(rec)

    entry = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "won": won,
        "darts": darts,
        "avg": round(avg, 1),
    }
    rec["history"].append(entry)
    if len(rec["history"]) > 50:
        rec["history"] = rec["history"][-50:]

    save_records(data)
    return new_milestones


def check_milestones(rec):
    new = []
    for m in MILESTONES:
        if m["key"] not in rec.get("milestones", []):
            if m["check"](rec):
                rec.setdefault("milestones", []).append(m["key"])
                new.append(m["label"])
    return new


def display_records(player_name):
    data, rec = get_player_records(player_name)

    print(f"\n{Color.muted('═' * 52)}")
    print(Color.title(f"{'RECORDS & STREAKS':^52}"))
    print(f"  {Color.BOLD}{player_name}{Color.RESET}")
    print(f"{Color.muted('═' * 52)}")

    total = rec["total_games"]
    wins = rec["total_wins"]
    losses = rec["total_losses"]
    win_pct = (wins / total * 100) if total > 0 else 0

    print(f"\n  {Color.BOLD}Karriere-Statistik{Color.RESET}")
    print(f"    Spiele:          {total}")
    print(f"    Siege/Niederl.:  {wins}/{losses} ({win_pct:.1f}%)")

    print(f"\n  {Color.BOLD}Serien{Color.RESET}")
    cws = rec["current_win_streak"]
    bws = rec["best_win_streak"]
    streak_color = Color.GREEN if cws >= 3 else (Color.YELLOW if cws >= 2 else "")
    print(f"    Aktuelle Serie:  {streak_color}{cws} Siege{Color.RESET if streak_color else ''}")
    print(f"    Beste Serie:     {Color.BOLD}{bws} Siege{Color.RESET}")

    cls = rec["current_loss_streak"]
    if cls > 0:
        print(f"    Verlustserie:    {Color.RED}{cls}{Color.RESET}")

    print(f"\n  {Color.BOLD}Bestleistungen{Color.RESET}")
    best_avg = rec["best_avg"]
    print(f"    Bester Ø:        {best_avg:.1f} Punkte/Runde")
    bd = rec["best_darts"]
    print(f"    Schnellstes Spiel: {bd if bd < 999 else '-'} Darts")
    print(f"    Höchste Runde:   {rec['highest_round']}")
    print(f"    180er:           {rec['total_180s']}")

    print(f"\n  {Color.BOLD}Gesamtwürfe{Color.RESET}")
    print(f"    Bullseyes:       {rec['total_bullseyes']}")
    print(f"    Triples:         {rec['total_triples']}")
    print(f"    Doubles:         {rec['total_doubles']}")
    print(f"    Busts:           {rec['total_busts']}")

    print(f"\n  {Color.BOLD}Tagesstreaks{Color.RESET}")
    print(f"    Aktuell:         {rec['current_daily_streak']} Tage")
    print(f"    Bester:          {rec['best_daily_streak']} Tage")

    milestones = rec.get("milestones", [])
    if milestones:
        print(f"\n  {Color.BOLD}Meilensteine ({len(milestones)}/{len(MILESTONES)}){Color.RESET}")
        for m in MILESTONES:
            if m["key"] in milestones:
                print(f"    {Color.GREEN}✓{Color.RESET} {m['label']}")
            else:
                print(f"    {Color.muted('○')} {Color.muted(m['label'])}")

    history = rec.get("history", [])
    if history:
        print(f"\n  {Color.BOLD}Letzte Spiele{Color.RESET}")
        for entry in history[-5:]:
            result = f"{Color.GREEN}S{Color.RESET}" if entry["won"] else f"{Color.RED}N{Color.RESET}"
            print(f"    [{result}] {entry['date']} | {entry['darts']} Darts | Ø {entry['avg']:.1f}")

    print(f"{Color.muted('═' * 52)}")
    save_records(data)


def records_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'RECORDS & STREAKS':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Spieler-Records anzeigen")
    print("    2) Meilenstein-Übersicht")
    print("    3) Zurück")

    while True:
        choice = input("  Wahl (1-3): ").strip()

        if choice == "3":
            return
        elif choice == "1":
            name = input("\n  Spielername: ").strip()
            if name:
                display_records(name)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "2":
            name = input("\n  Spielername: ").strip()
            if name:
                data, rec = get_player_records(name)
                milestones = rec.get("milestones", [])
                print(f"\n  {Color.BOLD}Meilensteine für {name}{Color.RESET}")
                print(f"  Erreicht: {len(milestones)}/{len(MILESTONES)}")
                print(f"  {Color.muted('─' * 40)}")
                for m in MILESTONES:
                    if m["key"] in milestones:
                        print(f"    {Color.GREEN}✓{Color.RESET} {m['label']}")
                    else:
                        print(f"    {Color.muted('○')} {Color.muted(m['label'])}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        print("  Bitte 1-3 wählen.")
