#!/usr/bin/env python3
"""Dart-Liga-System: Mehrtägige Liga mit Punktetabelle."""

import json
import os
import time
from datetime import datetime
from dart_game import (
    DartBoard, Color, Player, Statistics,
    play_leg, choose_skill, SKILL_LEVELS,
)

LEAGUE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "league_data.json")


def load_leagues():
    if os.path.exists(LEAGUE_FILE):
        try:
            with open(LEAGUE_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {"leagues": [], "archive": []}


def save_leagues(data):
    with open(LEAGUE_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def create_league(name, player_names, start_score=501, rounds=None):
    num = len(player_names)
    if rounds is None:
        rounds = (num - 1) * 2

    standings = {}
    for p in player_names:
        standings[p] = {
            "played": 0,
            "won": 0,
            "lost": 0,
            "points": 0,
            "legs_won": 0,
            "legs_lost": 0,
            "best_avg": 0.0,
            "180s": 0,
        }

    schedule = generate_schedule(player_names, rounds)

    league = {
        "name": name,
        "players": player_names,
        "start_score": start_score,
        "total_rounds": rounds,
        "current_round": 1,
        "standings": standings,
        "schedule": schedule,
        "results": [],
        "created": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "status": "active",
    }

    data = load_leagues()
    data["leagues"].append(league)
    save_leagues(data)
    return league


def generate_schedule(players, rounds):
    n = len(players)
    schedule = []

    player_list = list(players)
    if n % 2 == 1:
        player_list.append(None)
        n += 1

    for r in range(rounds):
        round_matches = []
        rotation = list(player_list)

        base_round = r % (n - 1)
        mid = rotation[1:]
        rotated = mid[base_round:] + mid[:base_round]
        current = [rotation[0]] + rotated

        for i in range(n // 2):
            home = current[i]
            away = current[n - 1 - i]
            if home is None or away is None:
                continue
            if r >= (n - 1):
                home, away = away, home
            round_matches.append({"home": home, "away": away, "played": False})

        schedule.append(round_matches)

    return schedule


def display_standings(league):
    print(f"\n{Color.muted('═' * 62)}")
    print(Color.title(f"{'LIGA: ' + league['name']:^62}"))
    print(f"{Color.muted('═' * 62)}")

    sorted_players = sorted(
        league["standings"].items(),
        key=lambda x: (-x[1]["points"], -(x[1]["legs_won"] - x[1]["legs_lost"]), -x[1]["best_avg"]),
    )

    print(f"  {'#':>2}  {'Spieler':<16} {'Sp':>3} {'S':>3} {'N':>3} {'Pkt':>4} {'LW':>3} {'LN':>3} {'Ø':>6}")
    print(f"  {Color.muted('─' * 56)}")

    for i, (name, s) in enumerate(sorted_players, 1):
        diff = s["legs_won"] - s["legs_lost"]
        diff_str = f"+{diff}" if diff > 0 else str(diff)

        if i == 1:
            pos = f"{Color.YELLOW}{i:>2}{Color.RESET}"
            name_fmt = f"{Color.BOLD}{name:<16}{Color.RESET}"
        elif i <= 3:
            pos = f"{Color.GREEN}{i:>2}{Color.RESET}"
            name_fmt = f"{name:<16}"
        else:
            pos = f"{i:>2}"
            name_fmt = f"{name:<16}"

        avg_str = f"{s['best_avg']:.1f}" if s["best_avg"] > 0 else "-"

        print(f"  {pos}  {name_fmt} {s['played']:>3} {s['won']:>3} {s['lost']:>3} "
              f"{Color.BOLD}{s['points']:>4}{Color.RESET} {s['legs_won']:>3} {s['legs_lost']:>3} {avg_str:>6}")

    round_info = f"Spieltag {league['current_round']}/{league['total_rounds']}"
    print(f"\n  {Color.info(round_info)} | Modus: {league['start_score']}")
    print(f"{Color.muted('═' * 62)}")


def display_round_schedule(league, round_num):
    if round_num < 1 or round_num > len(league["schedule"]):
        print(Color.warning("  Ungültiger Spieltag."))
        return

    matches = league["schedule"][round_num - 1]
    print(f"\n  {Color.BOLD}Spieltag {round_num}{Color.RESET}")
    print(f"  {Color.muted('─' * 40)}")

    for i, m in enumerate(matches, 1):
        if m["played"]:
            result = next(
                (r for r in league["results"]
                 if r["round"] == round_num and r["home"] == m["home"] and r["away"] == m["away"]),
                None,
            )
            if result:
                w_marker_h = " ★" if result["winner"] == m["home"] else ""
                w_marker_a = " ★" if result["winner"] == m["away"] else ""
                print(f"    {i}) {m['home']}{w_marker_h} vs {m['away']}{w_marker_a} "
                      f"{Color.GREEN}[gespielt]{Color.RESET}")
            else:
                print(f"    {i}) {m['home']} vs {m['away']} {Color.GREEN}[gespielt]{Color.RESET}")
        else:
            print(f"    {i}) {m['home']} vs {m['away']} {Color.YELLOW}[offen]{Color.RESET}")


def play_league_match(league, round_num, match_idx, skill):
    match = league["schedule"][round_num - 1][match_idx]
    if match["played"]:
        print(Color.warning("  Dieses Spiel wurde bereits gespielt."))
        return None

    home = match["home"]
    away = match["away"]
    start_score = league["start_score"]

    print(f"\n{Color.BOLD}{Color.MAGENTA}{'*' * 50}")
    print(f"  LIGA-SPIEL: {home} vs {away}")
    print(f"  Spieltag {round_num} | {league['name']}")
    print(f"{'*' * 50}{Color.RESET}")

    player1 = Player(home, start_score=start_score, skill=skill)
    player2 = Player(away, start_score=start_score, skill=skill)
    players = [player1, player2]
    board = DartBoard()

    input(Color.info("  [Enter] zum Starten..."))

    best_of = 3
    legs = {home: 0, away: 0}
    leg_num = 0
    winner_name = None

    while legs[home] < 2 and legs[away] < 2:
        leg_num += 1
        for p in players:
            p.score = start_score
            p.darts_thrown = 0
            p.rounds = 0
            p.stats = Statistics()

        leg_label = f"Leg {leg_num} | {home} {legs[home]}-{legs[away]} {away}"
        leg_winner = play_leg(players, board, start_score, leg_label=leg_label)
        legs[leg_winner.name] += 1

        print(f"\n  Leg {leg_num}: {Color.success(leg_winner.name + ' gewinnt!')}")
        print(f"  Stand: {home} {legs[home]} - {legs[away]} {away}")

        if legs[leg_winner.name] < 2:
            input(Color.muted("  [Enter] für nächstes Leg..."))

    winner_name = home if legs[home] > legs[away] else away
    loser_name = away if winner_name == home else home

    match["played"] = True

    best_avg = max(
        players[0].stats.average_per_round,
        players[1].stats.average_per_round,
    )

    result = {
        "round": round_num,
        "home": home,
        "away": away,
        "winner": winner_name,
        "legs_home": legs[home],
        "legs_away": legs[away],
        "best_avg": round(best_avg, 1),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    league["results"].append(result)

    s_w = league["standings"][winner_name]
    s_w["played"] += 1
    s_w["won"] += 1
    s_w["points"] += 3
    s_w["legs_won"] += legs[winner_name]
    s_w["legs_lost"] += legs[loser_name]
    if best_avg > s_w["best_avg"]:
        s_w["best_avg"] = round(best_avg, 1)

    s_l = league["standings"][loser_name]
    s_l["played"] += 1
    s_l["lost"] += 1
    s_l["legs_won"] += legs[loser_name]
    s_l["legs_lost"] += legs[winner_name]

    print(f"\n  {Color.success(f'{winner_name} gewinnt {legs[winner_name]}-{legs[loser_name]}!')}")

    all_played = all(m["played"] for m in league["schedule"][round_num - 1])
    if all_played and league["current_round"] < league["total_rounds"]:
        league["current_round"] += 1

    all_done = all(
        m["played"]
        for round_matches in league["schedule"]
        for m in round_matches
    )
    if all_done:
        league["status"] = "finished"

    return winner_name


def finish_league(league):
    sorted_players = sorted(
        league["standings"].items(),
        key=lambda x: (-x[1]["points"], -(x[1]["legs_won"] - x[1]["legs_lost"])),
    )

    champion = sorted_players[0][0]

    print(f"\n{Color.BOLD}{Color.YELLOW}")
    print(f"  {'★' * 50}")
    print(f"  {'':^50}")
    print(f"  {'🏆 LIGA-MEISTER 🏆':^50}")
    print(f"  {champion:^50}")
    print(f"  {'':^50}")
    stats = sorted_players[0][1]
    info = f"{stats['won']}S {stats['lost']}N | {stats['points']} Punkte"
    print(f"  {info:^50}")
    print(f"  {'':^50}")
    print(f"  {'★' * 50}")
    print(f"{Color.RESET}")

    if len(sorted_players) >= 2:
        print(f"  {Color.muted('Podium:')}")
        medals = ["🥇", "🥈", "🥉"]
        for i, (name, s) in enumerate(sorted_players[:3]):
            medal = medals[i] if i < 3 else f"  {i+1}."
            print(f"    {medal} {name} - {s['points']} Pkt ({s['won']}S/{s['lost']}N)")

    data = load_leagues()
    for i, lg in enumerate(data["leagues"]):
        if lg["name"] == league["name"] and lg["created"] == league["created"]:
            data["leagues"].pop(i)
            data["archive"].append(league)
            break
    save_leagues(data)


def league_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART-LIGA':^50}"))
    print(Color.muted("=" * 50))

    while True:
        print("\n    1) Neue Liga erstellen")
        print("    2) Aktive Liga fortsetzen")
        print("    3) Liga-Archiv")
        print("    4) Zurück")

        choice = input("  Wahl (1-4): ").strip()

        if choice == "4":
            return

        elif choice == "1":
            name = input("\n  Liga-Name: ").strip() or "Dart-Liga"
            try:
                num_players = int(input("  Anzahl Spieler (3-8): ").strip())
                num_players = max(3, min(8, num_players))
            except ValueError:
                num_players = 4

            players = []
            for i in range(num_players):
                pname = input(f"  Name Spieler {i + 1}: ").strip()
                if not pname:
                    pname = f"Spieler {i + 1}"
                players.append(pname)

            print("\n  Punktemodus:")
            print("    1) 301")
            print("    2) 501")
            sc = input("  Wahl (1-2): ").strip()
            start_score = 301 if sc == "1" else 501

            try:
                rounds = int(input(f"  Spieltage (Standard: {(num_players - 1) * 2}): ").strip())
                rounds = max(1, min(20, rounds))
            except ValueError:
                rounds = (num_players - 1) * 2

            league = create_league(name, players, start_score, rounds)
            display_standings(league)
            print(Color.success(f"\n  Liga '{name}' erstellt!"))

        elif choice == "2":
            data = load_leagues()
            active = [lg for lg in data["leagues"] if lg["status"] == "active"]

            if not active:
                print(Color.warning("  Keine aktive Liga vorhanden."))
                continue

            print("\n  Aktive Ligen:")
            for i, lg in enumerate(active, 1):
                print(f"    {i}) {lg['name']} (Spieltag {lg['current_round']}/{lg['total_rounds']})")

            try:
                idx = int(input("  Wahl: ").strip()) - 1
                if idx < 0 or idx >= len(active):
                    continue
            except ValueError:
                continue

            league = active[idx]
            skill = choose_skill()
            play_league_session(league, skill)

            for i, lg in enumerate(data["leagues"]):
                if lg["name"] == league["name"] and lg["created"] == league["created"]:
                    data["leagues"][i] = league
                    break
            save_leagues(data)

        elif choice == "3":
            data = load_leagues()
            if not data["archive"]:
                print(Color.warning("  Kein Liga-Archiv vorhanden."))
                continue

            print("\n  Abgeschlossene Ligen:")
            for i, lg in enumerate(data["archive"], 1):
                sorted_p = sorted(
                    lg["standings"].items(),
                    key=lambda x: -x[1]["points"],
                )
                champ = sorted_p[0][0] if sorted_p else "?"
                print(f"    {i}) {lg['name']} - Meister: {champ} ({lg['created']})")

            try:
                idx = int(input("  Details anzeigen (Nr): ").strip()) - 1
                if 0 <= idx < len(data["archive"]):
                    display_standings(data["archive"][idx])
            except ValueError:
                pass


def play_league_session(league, skill):
    while True:
        display_standings(league)

        r = league["current_round"]
        display_round_schedule(league, r)

        unplayed = [
            (i, m) for i, m in enumerate(league["schedule"][r - 1])
            if not m["played"]
        ]

        if not unplayed:
            if r >= league["total_rounds"]:
                print(Color.success("\n  Alle Spiele abgeschlossen!"))
                league["status"] = "finished"
                finish_league(league)
                return
            else:
                print(Color.info(f"\n  Weiter zu Spieltag {league['current_round']}!"))
                continue

        print(f"\n    n) Nächstes Spiel spielen")
        print(f"    t) Tabelle anzeigen")
        print(f"    q) Liga unterbrechen")

        action = input("  Wahl: ").strip().lower()

        if action == "q":
            return
        elif action == "t":
            display_standings(league)
        elif action == "n":
            idx, match = unplayed[0]
            play_league_match(league, r, idx, skill)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
