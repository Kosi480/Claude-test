#!/usr/bin/env python3
"""Handicap-System: Automatische Vorgabe basierend auf Spielerhistorie."""

import json
import os
from dart_game import Color

HANDICAP_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "handicap_data.json")

HANDICAP_TIERS = [
    {"name": "Anfänger", "avg_range": (0, 25), "handicap_pct": 30},
    {"name": "Fortgeschritten", "avg_range": (25, 40), "handicap_pct": 20},
    {"name": "Gut", "avg_range": (40, 55), "handicap_pct": 10},
    {"name": "Sehr gut", "avg_range": (55, 70), "handicap_pct": 5},
    {"name": "Profi", "avg_range": (70, 999), "handicap_pct": 0},
]


def load_handicaps():
    if os.path.exists(HANDICAP_FILE):
        try:
            with open(HANDICAP_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_handicaps(data):
    try:
        with open(HANDICAP_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except (IOError, OSError):
        pass


def get_player_avg(player_name):
    profiles_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "profiles.json")
    if os.path.exists(profiles_path):
        try:
            with open(profiles_path, "r") as f:
                profiles = json.load(f)
            if player_name in profiles:
                return profiles[player_name].get("best_avg", 0)
        except (json.JSONDecodeError, IOError):
            pass

    history_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "match_history.json")
    if os.path.exists(history_path):
        try:
            with open(history_path, "r") as f:
                history = json.load(f)
            matches = history if isinstance(history, list) else history.get("matches", [])
            avgs = []
            for m in matches:
                for p in m.get("players", []):
                    if p.get("name") == player_name:
                        avg = p.get("avg_round", 0)
                        if avg > 0:
                            avgs.append(avg)
            if avgs:
                return sum(avgs) / len(avgs)
        except (json.JSONDecodeError, IOError):
            pass

    return 0


def determine_tier(avg):
    for tier in HANDICAP_TIERS:
        low, high = tier["avg_range"]
        if low <= avg < high:
            return tier
    return HANDICAP_TIERS[-1]


def calculate_handicap(player_name, base_score=501):
    data = load_handicaps()

    if player_name in data and data[player_name].get("manual") is not None:
        return data[player_name]["manual"]

    avg = get_player_avg(player_name)
    tier = determine_tier(avg)
    reduction = int(base_score * tier["handicap_pct"] / 100)

    return base_score - reduction


def calculate_match_handicaps(player_names, base_score=501):
    avgs = {}
    for name in player_names:
        avgs[name] = get_player_avg(name)

    if all(a == 0 for a in avgs.values()):
        return {name: base_score for name in player_names}

    tiers = {name: determine_tier(avg) for name, avg in avgs.items()}

    best_tier_idx = max(
        range(len(player_names)),
        key=lambda i: avgs[player_names[i]],
    )
    best_name = player_names[best_tier_idx]

    handicaps = {}
    for name in player_names:
        if name == best_name:
            handicaps[name] = base_score
        else:
            diff = avgs[best_name] - avgs[name]
            if diff <= 5:
                reduction = 0
            elif diff <= 15:
                reduction = int(base_score * 0.05)
            elif diff <= 30:
                reduction = int(base_score * 0.12)
            else:
                reduction = int(base_score * 0.20)
            handicaps[name] = base_score - reduction

    return handicaps


def set_manual_handicap(player_name, score):
    data = load_handicaps()
    if player_name not in data:
        data[player_name] = {}
    data[player_name]["manual"] = score
    save_handicaps(data)


def clear_manual_handicap(player_name):
    data = load_handicaps()
    if player_name in data:
        data[player_name]["manual"] = None
        save_handicaps(data)


def display_handicap_info(player_names, base_score=501):
    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'HANDICAP-ÜBERSICHT':^50}"))
    print(f"{Color.muted('═' * 50)}")

    handicaps = calculate_match_handicaps(player_names, base_score)

    for name in player_names:
        avg = get_player_avg(name)
        tier = determine_tier(avg)
        hc = handicaps[name]
        diff = base_score - hc

        print(f"\n  {Color.BOLD}{name}{Color.RESET}")
        print(f"    Ø Punkte/Runde: {avg:.1f}")
        print(f"    Kategorie:      {tier['name']}")

        if diff > 0:
            print(f"    Startscore:     {Color.CYAN}{hc}{Color.RESET} "
                  f"({Color.GREEN}-{diff} Vorgabe{Color.RESET})")
        else:
            print(f"    Startscore:     {hc} (keine Vorgabe)")

    print(f"{Color.muted('═' * 50)}")
    return handicaps


def handicap_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'HANDICAP-SYSTEM':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Handicap berechnen (2 Spieler)")
    print("    2) Spieler-Kategorie anzeigen")
    print("    3) Manuelles Handicap setzen")
    print("    4) Manuelles Handicap löschen")
    print("    5) Zurück")

    while True:
        choice = input("  Wahl (1-5): ").strip()

        if choice == "5":
            return
        elif choice == "1":
            names = []
            for i in range(2):
                name = input(f"  Spieler {i + 1}: ").strip()
                if not name:
                    name = f"Spieler {i + 1}"
                names.append(name)

            print("\n  Basis-Score:")
            print("    1) 301")
            print("    2) 501")
            sc = input("  Wahl (1-2): ").strip()
            base = 301 if sc == "1" else 501

            display_handicap_info(names, base)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        elif choice == "2":
            name = input("\n  Spielername: ").strip()
            if not name:
                continue
            avg = get_player_avg(name)
            tier = determine_tier(avg)
            print(f"\n  {Color.BOLD}{name}{Color.RESET}")
            print(f"    Ø Punkte/Runde: {avg:.1f}")
            print(f"    Kategorie:      {tier['name']}")
            print(f"    Vorgabe:        {tier['handicap_pct']}%")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        elif choice == "3":
            name = input("\n  Spielername: ").strip()
            if not name:
                continue
            try:
                score = int(input("  Manueller Startscore: ").strip())
                score = max(101, min(701, score))
            except ValueError:
                continue
            set_manual_handicap(name, score)
            print(f"  {Color.success(f'Handicap für {name}: {score}')}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        elif choice == "4":
            name = input("\n  Spielername: ").strip()
            if not name:
                continue
            clear_manual_handicap(name)
            print(f"  {Color.success(f'Manuelles Handicap für {name} gelöscht.')}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-5 wählen.")
