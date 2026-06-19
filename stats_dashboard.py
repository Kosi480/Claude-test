#!/usr/bin/env python3
"""Statistik-Dashboard mit Karriere-Übersicht und Diagrammen."""

import json
import os
from dart_game import Color
from profiles import ProfileManager, ACHIEVEMENTS
from leaderboard import Leaderboard, get_rank


def _bar_chart(values, labels, max_width=30, color=Color.CYAN):
    if not values:
        return
    max_val = max(values) if max(values) > 0 else 1
    for label, val in zip(labels, values):
        bar_len = int((val / max_val) * max_width)
        bar = "█" * bar_len
        print(f"    {label:>8} {color}{bar}{Color.RESET} {val}")


def _sparkline(values, width=20):
    if not values:
        return "---"
    blocks = " ▁▂▃▄▅▆▇█"
    mn, mx = min(values), max(values)
    rng = mx - mn if mx != mn else 1
    step = len(values) / width if len(values) > width else 1
    sampled = []
    i = 0.0
    while i < len(values) and len(sampled) < width:
        sampled.append(values[int(i)])
        i += step
    return "".join(blocks[min(int((v - mn) / rng * 8), 8)] for v in sampled)


def display_career_overview(name):
    profiles = ProfileManager.load_all()
    if name not in profiles:
        print(f"  Spieler '{name}' nicht gefunden.")
        return

    p = profiles[name]

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'KARRIERE-DASHBOARD':^56}"))
    print(f"{Color.muted('═' * 56)}")
    print(f"  {Color.BOLD}{p.name}{Color.RESET} | Level {p.level} {Color.info(p.title)}")
    print(f"  {p.xp_progress}")

    print(f"\n  {Color.title('Karriere-Statistiken')}")
    print(f"  {Color.muted('─' * 40)}")

    total_games = p.total_games
    wins = p.total_wins
    losses = total_games - wins
    wr = f"{p.win_rate:.1f}%" if total_games > 0 else "-"

    print(f"    Spiele gesamt:   {Color.BOLD}{total_games}{Color.RESET}")
    print(f"    Siege/Niederl.:  {Color.success(str(wins))} / {Color.warning(str(losses))}")
    print(f"    Siegrate:        {Color.BOLD}{wr}{Color.RESET}")
    print(f"    Darts gesamt:    {p.total_darts}")

    if p.total_darts > 0 and p.total_rounds > 0:
        avg_per_dart = p.total_darts / p.total_rounds if p.total_rounds > 0 else 0
        print(f"    Darts/Runde:     {avg_per_dart:.1f}")

    print(f"    Bullseyes:       {Color.YELLOW}{p.total_bullseyes}{Color.RESET}")
    print(f"    Triples:         {Color.RED}{p.total_triples}{Color.RESET}")
    print(f"    Runden gesamt:   {p.total_rounds}")

    if p.total_darts > 0:
        bull_rate = (p.total_bullseyes / p.total_darts) * 100
        triple_rate = (p.total_triples / p.total_darts) * 100
        print(f"\n  {Color.title('Trefferquoten')}")
        print(f"  {Color.muted('─' * 40)}")
        print(f"    Bullseye-Rate:   {bull_rate:.1f}%")
        print(f"    Triple-Rate:     {triple_rate:.1f}%")

    achievements_earned = len(p.achievements)
    achievements_total = len(ACHIEVEMENTS)
    pct = int((achievements_earned / achievements_total) * 100) if achievements_total > 0 else 0
    bar_len = 20
    filled = int((achievements_earned / achievements_total) * bar_len) if achievements_total > 0 else 0
    bar = "█" * filled + "░" * (bar_len - filled)

    print(f"\n  {Color.title('Achievements')}")
    print(f"  {Color.muted('─' * 40)}")
    print(f"    [{Color.GREEN}{bar}{Color.RESET}] {achievements_earned}/{achievements_total} ({pct}%)")
    for key in p.achievements:
        if key in ACHIEVEMENTS:
            title, _ = ACHIEVEMENTS[key]
            print(f"    {Color.GREEN}★{Color.RESET} {title}")


def display_elo_history(name):
    lb_data = Leaderboard.load()
    if name not in lb_data:
        print(f"  Spieler '{name}' hat noch keine Elo-Daten.")
        return

    info = lb_data[name]
    elo = info["elo"]
    peak = info["peak_elo"]
    rank_name, rank_color = get_rank(elo)
    history = info.get("history", [])

    print(f"\n  {Color.title('Elo-Verlauf')}")
    print(f"  {Color.muted('─' * 40)}")
    print(f"    Aktuell:   {Color.BOLD}{elo}{Color.RESET} {rank_color}{rank_name}{Color.RESET}")
    print(f"    Peak:      {Color.BOLD}{peak}{Color.RESET}")

    if history:
        elo_values = []
        current = info.get("elo", 1000)
        for h in reversed(history):
            current = current - h["elo_change"]
        for h in history:
            current += h["elo_change"]
            elo_values.append(current)

        wins = sum(1 for h in history if h["result"] == "W")
        losses = sum(1 for h in history if h["result"] == "L")
        print(f"    Letzte {len(history)}: {Color.success(f'{wins}W')} / {Color.warning(f'{losses}L')}")

        if elo_values:
            spark = _sparkline(elo_values)
            print(f"    Trend:     {Color.CYAN}{spark}{Color.RESET}")

        recent_changes = [h["elo_change"] for h in history[-5:]]
        if recent_changes:
            labels = [f"Spiel {i+1}" for i in range(len(recent_changes))]
            print(f"\n    {Color.muted('Letzte Elo-Änderungen:')}")
            for i, (label, change) in enumerate(zip(labels, recent_changes)):
                if change >= 0:
                    bar = "█" * min(change, 30)
                    print(f"      {label}: {Color.GREEN}+{change:>3} {bar}{Color.RESET}")
                else:
                    bar = "█" * min(abs(change), 30)
                    print(f"      {label}: {Color.RED}{change:>3} {bar}{Color.RESET}")


def display_comparison(name1, name2):
    profiles = ProfileManager.load_all()
    lb_data = Leaderboard.load()

    for name in (name1, name2):
        if name not in profiles:
            print(f"  Spieler '{name}' nicht gefunden.")
            return

    p1 = profiles[name1]
    p2 = profiles[name2]

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'SPIELER-VERGLEICH':^56}"))
    print(f"{Color.muted('═' * 56)}")

    header = f"{'':>18} {name1:^14} {'vs':^4} {name2:^14}"
    print(f"  {header}")
    print(f"  {Color.muted('─' * 52)}")

    rows = [
        ("Level", str(p1.level), str(p2.level)),
        ("Spiele", str(p1.total_games), str(p2.total_games)),
        ("Siege", str(p1.total_wins), str(p2.total_wins)),
        ("Siegrate", f"{p1.win_rate:.0f}%", f"{p2.win_rate:.0f}%"),
        ("Darts", str(p1.total_darts), str(p2.total_darts)),
        ("Bullseyes", str(p1.total_bullseyes), str(p2.total_bullseyes)),
        ("Triples", str(p1.total_triples), str(p2.total_triples)),
        ("Achievements", f"{len(p1.achievements)}/{len(ACHIEVEMENTS)}",
         f"{len(p2.achievements)}/{len(ACHIEVEMENTS)}"),
    ]

    if name1 in lb_data:
        elo1 = str(lb_data[name1]["elo"])
    else:
        elo1 = "-"
    if name2 in lb_data:
        elo2 = str(lb_data[name2]["elo"])
    else:
        elo2 = "-"
    rows.append(("Elo", elo1, elo2))

    def _parse_val(v):
        v = v.strip().rstrip("%")
        if "/" in v:
            parts = v.split("/")
            return float(parts[0]) / float(parts[1]) if float(parts[1]) != 0 else 0.0
        return float(v)

    for label, v1, v2 in rows:
        try:
            n1, n2 = _parse_val(v1), _parse_val(v2)
            if n1 > n2:
                v1_fmt = f"{Color.GREEN}{v1}{Color.RESET}"
                v2_fmt = v2
            elif n2 > n1:
                v1_fmt = v1
                v2_fmt = f"{Color.GREEN}{v2}{Color.RESET}"
            else:
                v1_fmt = v1
                v2_fmt = v2
        except ValueError:
            v1_fmt = v1
            v2_fmt = v2

        print(f"    {label:>14}  {v1_fmt:^24} {v2_fmt:^24}")

    head2head = []
    if name1 in lb_data and "history" in lb_data[name1]:
        for h in lb_data[name1]["history"]:
            if h["vs"] == name2:
                head2head.append(h)

    if head2head:
        h2h_wins = sum(1 for h in head2head if h["result"] == "W")
        h2h_losses = len(head2head) - h2h_wins
        print(f"\n  {Color.title('Head-to-Head')}")
        print(f"    {name1}: {Color.success(f'{h2h_wins}W')} | {name2}: {Color.success(f'{h2h_losses}W')}")

    print(f"{Color.muted('═' * 56)}")


def display_global_stats():
    profiles = ProfileManager.load_all()
    lb_data = Leaderboard.load()

    if not profiles:
        print(f"  {Color.muted('Noch keine Spielerdaten vorhanden.')}")
        return

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'GLOBALE STATISTIKEN':^56}"))
    print(f"{Color.muted('═' * 56)}")

    total_players = len(profiles)
    total_games = sum(p.total_games for p in profiles.values())
    total_darts = sum(p.total_darts for p in profiles.values())
    total_bulls = sum(p.total_bullseyes for p in profiles.values())
    total_trips = sum(p.total_triples for p in profiles.values())

    print(f"    Spieler gesamt:    {Color.BOLD}{total_players}{Color.RESET}")
    print(f"    Spiele gesamt:     {Color.BOLD}{total_games}{Color.RESET}")
    print(f"    Darts geworfen:    {Color.BOLD}{total_darts}{Color.RESET}")
    print(f"    Bullseyes gesamt:  {Color.YELLOW}{total_bulls}{Color.RESET}")
    print(f"    Triples gesamt:    {Color.RED}{total_trips}{Color.RESET}")

    if profiles:
        top_by_wins = sorted(profiles.values(), key=lambda p: p.total_wins, reverse=True)[:3]
        if top_by_wins and top_by_wins[0].total_wins > 0:
            print(f"\n  {Color.title('Top Spieler (Siege)')}")
            for i, p in enumerate(top_by_wins, 1):
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
                print(f"    {medal} {p.name:<16} {Color.BOLD}{p.total_wins}{Color.RESET} Siege")

        top_by_bulls = sorted(profiles.values(), key=lambda p: p.total_bullseyes, reverse=True)[:3]
        if top_by_bulls and top_by_bulls[0].total_bullseyes > 0:
            print(f"\n  {Color.title('Top Spieler (Bullseyes)')}")
            for i, p in enumerate(top_by_bulls, 1):
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
                print(f"    {medal} {p.name:<16} {Color.YELLOW}{p.total_bullseyes}{Color.RESET}")

        most_achieved = sorted(profiles.values(), key=lambda p: len(p.achievements), reverse=True)[:3]
        if most_achieved and len(most_achieved[0].achievements) > 0:
            print(f"\n  {Color.title('Achievement-Jäger')}")
            for i, p in enumerate(most_achieved, 1):
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
                count = len(p.achievements)
                print(f"    {medal} {p.name:<16} {Color.GREEN}{count}/{len(ACHIEVEMENTS)}{Color.RESET}")

    if lb_data:
        sorted_elo = sorted(lb_data.items(), key=lambda x: x[1]["elo"], reverse=True)
        if sorted_elo:
            top_name, top_info = sorted_elo[0]
            rank_name, rank_color = get_rank(top_info["elo"])
            print(f"\n  {Color.title('Höchstes Elo')}")
            print(f"    👑 {top_name}: {Color.BOLD}{top_info['elo']}{Color.RESET} "
                  f"{rank_color}{rank_name}{Color.RESET}")

    print(f"{Color.muted('═' * 56)}")


def stats_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'STATISTIK-DASHBOARD':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Karriere-Übersicht")
    print("    2) Elo-Verlauf")
    print("    3) Spieler-Vergleich")
    print("    4) Globale Statistiken")
    print("    5) Zurück")

    while True:
        choice = input("  Wahl (1-5): ").strip()
        if choice == "1":
            name = input("  Spielername: ").strip()
            if name:
                display_career_overview(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            name = input("  Spielername: ").strip()
            if name:
                display_elo_history(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            name1 = input("  Spieler 1: ").strip()
            name2 = input("  Spieler 2: ").strip()
            if name1 and name2:
                display_comparison(name1, name2)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            display_global_stats()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "5":
            return
        print("  Bitte 1-5 wählen.")
