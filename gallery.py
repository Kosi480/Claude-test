#!/usr/bin/env python3
"""Achievement Gallery: Visuelle Übersicht aller Errungenschaften."""

import json
import os
from dart_game import Color

ALL_ACHIEVEMENTS = [
    {"id": "first_win", "name": "Erster Sieg", "desc": "Gewinne dein erstes Spiel", "cat": "Grundlagen", "icon": "🎯"},
    {"id": "first_180", "name": "Erste 180", "desc": "Wirf eine perfekte 180", "cat": "Scoring", "icon": "💯"},
    {"id": "wins_10", "name": "Zehnkämpfer", "desc": "Gewinne 10 Spiele", "cat": "Grundlagen", "icon": "🏅"},
    {"id": "wins_50", "name": "Veteran", "desc": "Gewinne 50 Spiele", "cat": "Grundlagen", "icon": "🎖"},
    {"id": "avg_60", "name": "Scharfschütze", "desc": "Erziele Ø 60+ in einem Spiel", "cat": "Scoring", "icon": "🎯"},
    {"id": "avg_80", "name": "Meisterschütze", "desc": "Erziele Ø 80+ in einem Spiel", "cat": "Scoring", "icon": "👑"},
    {"id": "darts_15", "name": "Blitzfinish", "desc": "Gewinne mit 15 oder weniger Darts", "cat": "Speed", "icon": "⚡"},
    {"id": "streak_5", "name": "Auf Feuer", "desc": "5 Siege in Folge", "cat": "Serien", "icon": "🔥"},
    {"id": "streak_10", "name": "Unaufhaltbar", "desc": "10 Siege in Folge", "cat": "Serien", "icon": "💪"},
    {"id": "bullseye_50", "name": "Bullseye-Fan", "desc": "50 Bullseyes insgesamt", "cat": "Präzision", "icon": "🎯"},
    {"id": "bullseye_100", "name": "Bullseye-Meister", "desc": "100 Bullseyes insgesamt", "cat": "Präzision", "icon": "🏆"},
    {"id": "triple_500", "name": "Triple-König", "desc": "500 Triples insgesamt", "cat": "Scoring", "icon": "👑"},
    {"id": "daily_7", "name": "Wochenkämpfer", "desc": "7 Tage in Folge gespielt", "cat": "Hingabe", "icon": "📅"},
    {"id": "daily_30", "name": "Monatschampion", "desc": "30 Tage in Folge gespielt", "cat": "Hingabe", "icon": "🗓"},
    {"id": "cricket_win", "name": "Cricket-Sieger", "desc": "Gewinne ein Cricket-Spiel", "cat": "Modi", "icon": "🏏"},
    {"id": "tournament_win", "name": "Turniersieger", "desc": "Gewinne ein Turnier", "cat": "Modi", "icon": "🏆"},
    {"id": "league_champ", "name": "Liga-Meister", "desc": "Gewinne eine Liga", "cat": "Modi", "icon": "🥇"},
    {"id": "world_tour_star", "name": "Weltreisender", "desc": "Hole Sterne in 5 Ländern", "cat": "Modi", "icon": "🌍"},
    {"id": "world_tour_full", "name": "Weltmeister", "desc": "3 Sterne in allen Ländern", "cat": "Modi", "icon": "🌟"},
    {"id": "bust_0", "name": "Fehlerfrei", "desc": "Gewinne ein Spiel ohne Bust", "cat": "Präzision", "icon": "✨"},
    {"id": "elo_1200", "name": "Aufsteiger", "desc": "Erreiche 1200 Elo", "cat": "Ranking", "icon": "📈"},
    {"id": "elo_1500", "name": "Elitespieler", "desc": "Erreiche 1500 Elo", "cat": "Ranking", "icon": "⭐"},
    {"id": "games_100", "name": "Hundertprozentig", "desc": "Spiele 100 Spiele", "cat": "Grundlagen", "icon": "💯"},
    {"id": "checkout_170", "name": "Maximum Checkout", "desc": "Checke 170 aus (T20 T20 Bull)", "cat": "Scoring", "icon": "🔥"},
]

CATEGORIES = ["Grundlagen", "Scoring", "Speed", "Serien", "Präzision", "Hingabe", "Modi", "Ranking"]


def load_player_achievements(player_name):
    profiles_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "profiles.json")
    achievements = set()

    if os.path.exists(profiles_path):
        try:
            with open(profiles_path, "r") as f:
                profiles = json.load(f)
            if player_name in profiles:
                for a in profiles[player_name].get("achievements", []):
                    if isinstance(a, str):
                        achievements.add(a.lower().replace(" ", "_").replace("-", "_"))
                    elif isinstance(a, (list, tuple)) and len(a) > 0:
                        achievements.add(str(a[0]).lower().replace(" ", "_").replace("-", "_"))
        except (json.JSONDecodeError, IOError):
            pass

    records_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "records_data.json")
    if os.path.exists(records_path):
        try:
            with open(records_path, "r") as f:
                records = json.load(f)
            if player_name in records:
                for m in records[player_name].get("milestones", []):
                    achievements.add(m)
        except (json.JSONDecodeError, IOError):
            pass

    return achievements


def display_gallery(player_name):
    unlocked = load_player_achievements(player_name)

    total = len(ALL_ACHIEVEMENTS)
    earned = sum(1 for a in ALL_ACHIEVEMENTS if a["id"] in unlocked)
    pct = (earned / total * 100) if total > 0 else 0

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'ACHIEVEMENT GALLERY':^56}"))
    print(f"  {Color.BOLD}{player_name}{Color.RESET}")
    print(f"{Color.muted('═' * 56)}")

    bar_width = 40
    filled = int(pct / 100 * bar_width)
    empty = bar_width - filled
    bar = f"{Color.YELLOW}{'█' * filled}{Color.muted('░' * empty)}{Color.RESET}"
    print(f"\n  Fortschritt: [{bar}] {earned}/{total} ({pct:.0f}%)")

    for cat in CATEGORIES:
        cat_achievements = [a for a in ALL_ACHIEVEMENTS if a["cat"] == cat]
        if not cat_achievements:
            continue

        cat_earned = sum(1 for a in cat_achievements if a["id"] in unlocked)
        cat_total = len(cat_achievements)

        print(f"\n  {Color.BOLD}{cat}{Color.RESET} ({cat_earned}/{cat_total})")
        print(f"  {Color.muted('─' * 48)}")

        for a in cat_achievements:
            is_unlocked = a["id"] in unlocked

            if is_unlocked:
                print(f"    {a['icon']} {Color.GREEN}{Color.BOLD}{a['name']}{Color.RESET}")
                print(f"       {Color.muted(a['desc'])}")
            else:
                print(f"    {Color.muted('?')}  {Color.muted(a['name'])}")
                print(f"       {Color.muted(a['desc'])}")

    if pct == 100:
        print(f"\n  {Color.BOLD}{Color.YELLOW}★ ALLE ACHIEVEMENTS FREIGESCHALTET! ★{Color.RESET}")
    elif pct >= 75:
        print(f"\n  {Color.success('Fast komplett! Weiter so!')}")
    elif pct >= 50:
        print(f"\n  {Color.info('Guter Fortschritt!')}")
    elif pct >= 25:
        print(f"\n  {Color.muted('Auf dem Weg!')}")

    print(f"{Color.muted('═' * 56)}")


def display_rare_achievements():
    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'SELTENE ACHIEVEMENTS':^56}"))
    print(f"{Color.muted('═' * 56)}")

    rare = [a for a in ALL_ACHIEVEMENTS if a["id"] in (
        "avg_80", "streak_10", "darts_15", "checkout_170",
        "world_tour_full", "elo_1500", "daily_30",
    )]

    for a in rare:
        print(f"\n  {a['icon']} {Color.BOLD}{Color.YELLOW}{a['name']}{Color.RESET}")
        print(f"     {a['desc']}")
        print(f"     Kategorie: {a['cat']}")

    print(f"{Color.muted('═' * 56)}")


def gallery_menu():
    print(Color.muted("=" * 56))
    print(Color.title(f"{'ACHIEVEMENT GALLERY':^56}"))
    print(Color.muted("=" * 56))

    print("\n    1) Meine Achievements")
    print("    2) Alle Achievements anzeigen")
    print("    3) Seltene Achievements")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()

        if choice == "4":
            return
        elif choice == "1":
            name = input("\n  Spielername: ").strip()
            if name:
                display_gallery(name)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "2":
            print(f"\n  {Color.BOLD}Alle Achievements ({len(ALL_ACHIEVEMENTS)}){Color.RESET}")
            for cat in CATEGORIES:
                cat_a = [a for a in ALL_ACHIEVEMENTS if a["cat"] == cat]
                if cat_a:
                    print(f"\n  {Color.BOLD}{cat}:{Color.RESET}")
                    for a in cat_a:
                        print(f"    {a['icon']} {a['name']} - {Color.muted(a['desc'])}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "3":
            display_rare_achievements()
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-4 wählen.")
