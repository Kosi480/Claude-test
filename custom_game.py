#!/usr/bin/env python3
"""Benutzerdefinierte Spielregeln für flexible Dart-Partien."""

import sys
import time
from dart_game import (
    DartBoard, Color, Player, CPUPlayer, Statistics,
    throw_animation, ascii_board, celebration_animation,
    show_checkout_hint, display_scoreboard, choose_difficulty,
    choose_skill, SKILL_LEVELS, SKILL_ORDER, CPU_NAMES,
)


DEFAULT_RULES = {
    "start_score": 501,
    "double_out": False,
    "double_in": False,
    "max_darts_per_round": 3,
    "handicap": {},
    "sudden_death_round": 0,
    "mercy_rule": 0,
}


def configure_rules():
    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'SPIELREGELN KONFIGURIEREN':^50}"))
    print(f"{Color.muted('═' * 50)}")

    rules = dict(DEFAULT_RULES)

    print(f"\n  {Color.info('Startscore:')}")
    print("    1) 301")
    print("    2) 501 (Standard)")
    print("    3) 701")
    print("    4) 1001")
    print("    5) Eigener Wert")
    while True:
        c = input("  Wahl (1-5): ").strip()
        if c == "1":
            rules["start_score"] = 301
            break
        elif c == "2":
            rules["start_score"] = 501
            break
        elif c == "3":
            rules["start_score"] = 701
            break
        elif c == "4":
            rules["start_score"] = 1001
            break
        elif c == "5":
            try:
                val = int(input("  Score (100-9999): ").strip())
                if 100 <= val <= 9999:
                    rules["start_score"] = val
                    break
                print("  Bitte 100-9999.")
            except ValueError:
                print("  Bitte eine Zahl eingeben.")
        else:
            print("  Bitte 1-5 wählen.")

    print(f"\n  {Color.info('Double-Out?')} (Letzter Dart muss ein Double sein)")
    do = input("  (j/n, Standard: n): ").strip().lower()
    rules["double_out"] = do == "j"

    print(f"\n  {Color.info('Double-In?')} (Erster Treffer muss ein Double sein)")
    di = input("  (j/n, Standard: n): ").strip().lower()
    rules["double_in"] = di == "j"

    print(f"\n  {Color.info('Darts pro Runde:')}")
    print("    1) 3 (Standard)")
    print("    2) 4")
    print("    3) 5")
    print("    4) 6")
    while True:
        c = input("  Wahl (1-4): ").strip()
        if c in ("1", "2", "3", "4"):
            rules["max_darts_per_round"] = [3, 4, 5, 6][int(c) - 1]
            break
        print("  Bitte 1-4 wählen.")

    print(f"\n  {Color.info('Sudden Death?')} (Nach X Runden: nächster Treffer gewinnt)")
    sd = input("  Runde (0 = aus): ").strip()
    try:
        rules["sudden_death_round"] = max(0, int(sd))
    except ValueError:
        rules["sudden_death_round"] = 0

    print(f"\n  {Color.info('Gnade-Regel?')} (Spiel endet wenn Differenz > X)")
    mr = input("  Differenz (0 = aus): ").strip()
    try:
        rules["mercy_rule"] = max(0, int(mr))
    except ValueError:
        rules["mercy_rule"] = 0

    print(f"\n{Color.muted('─' * 50)}")
    print(Color.title("  Aktive Regeln:"))
    print(f"    Startscore:       {rules['start_score']}")
    print(f"    Double-Out:       {'Ja' if rules['double_out'] else 'Nein'}")
    print(f"    Double-In:        {'Ja' if rules['double_in'] else 'Nein'}")
    print(f"    Darts/Runde:      {rules['max_darts_per_round']}")
    if rules["sudden_death_round"] > 0:
        print(f"    Sudden Death:     Ab Runde {rules['sudden_death_round']}")
    if rules["mercy_rule"] > 0:
        print(f"    Gnade-Regel:      Bei {rules['mercy_rule']}+ Differenz")
    print(f"{Color.muted('─' * 50)}")

    return rules


def setup_custom_players(rules):
    start_score = rules["start_score"]

    print("\n  Gegner-Modus:")
    print("    1) Nur Menschen")
    print("    2) Gegen KI")
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

    skill = choose_skill()
    players = []
    for i in range(num_players):
        name = input(f"\nName Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        players.append(Player(name, start_score=start_score, skill=skill))

    use_handicap = input("\n  Handicap verwenden? (j/n): ").strip().lower()
    if use_handicap == "j":
        print(f"  {Color.info('Handicap: Spieler startet mit weniger Punkten')}")
        for p in players:
            try:
                h = int(input(f"    Handicap für {p.name} (0-{start_score // 2}): ").strip())
                h = max(0, min(h, start_score // 2))
                if h > 0:
                    p.score = start_score - h
                    rules["handicap"][p.name] = h
                    print(f"    {p.name} startet bei {p.score}")
            except ValueError:
                pass

    if mode == "2":
        num_cpu = 0
        max_cpu = 4 - num_players
        while num_cpu < 1:
            try:
                num_cpu = int(input(f"\nAnzahl KI-Gegner (1-{max_cpu}): "))
                if num_cpu < 1 or num_cpu > max_cpu:
                    num_cpu = 0
            except ValueError:
                pass

        difficulty = choose_difficulty()
        for i in range(num_cpu):
            cpu_name = CPU_NAMES[i % len(CPU_NAMES)]
            diff_label = CPUPlayer.DIFFICULTY_NAMES[difficulty]
            cpu = CPUPlayer(f"{cpu_name} ({diff_label})", difficulty, start_score=start_score)
            players.append(cpu)

    return players


def play_custom_round(player, board, rules, has_started_scoring):
    max_darts = rules["max_darts_per_round"]
    double_out = rules["double_out"]
    double_in = rules["double_in"]
    sudden_death = rules["sudden_death_round"]
    is_sudden_death = sudden_death > 0 and player.rounds >= sudden_death

    print(f"\n{Color.BOLD}--- {player.name} ist dran (Runde {player.rounds + 1}) ---{Color.RESET}")
    print(f"    Verbleibend: {Color.info(f'{player.score} Punkte')}")

    if is_sudden_death:
        print(f"    {Color.BOLD}{Color.RED}SUDDEN DEATH!{Color.RESET}")

    if player.score <= 170 and not player.is_cpu:
        show_checkout_hint(player.score)

    round_score = 0
    for dart in range(1, max_darts + 1):
        if player.is_cpu:
            time.sleep(0.5)
            print(Color.muted(f"  Dart {dart}/{max_darts} - {player.name} wirft..."))
            time.sleep(0.3)
            result, points = player.cpu_throw()
        else:
            input(f"  Dart {dart}/{max_darts} - [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw(spread=player.spread)

        player.stats.record_throw(result, points)
        if not player.is_cpu:
            print(ascii_board.render(result))
            celebration_animation(result)

        if double_in and not has_started_scoring.get(player.name, False):
            if result.startswith("Double") or result == "Bullseye":
                has_started_scoring[player.name] = True
                print(f"    {Color.success('Double-In geschafft!')}")
            else:
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"| {Color.muted('Warte auf Double-In...')}")
                continue

        if player.score - round_score - points < 0:
            print(f"    -> {Color.warning('BUST!')} {Color.colorize_result(result, points)}")
            player.stats.record_bust()
            player.stats.record_round(0)
            return False

        if double_out and player.score - round_score - points == 0:
            if not (result.startswith("Double") or result == "Bullseye"):
                print(f"    -> {Color.warning('BUST!')} {Color.colorize_result(result, points)} "
                      f"- {Color.muted('Double-Out benötigt!')}")
                player.stats.record_bust()
                player.stats.record_round(0)
                return False

        round_score += points
        player.darts_thrown += 1
        remaining = player.score - round_score
        print(f"    -> {Color.colorize_result(result, points)} | "
              f"Runden-Summe: {Color.BOLD}{round_score}{Color.RESET}")

        if remaining <= 170 and remaining > 0 and not player.is_cpu and dart < max_darts:
            show_checkout_hint(remaining)

        if remaining == 0:
            player.score = 0
            player.rounds += 1
            player.stats.record_round(round_score)
            return True

        if is_sudden_death and points > 0:
            player.score = 0
            player.rounds += 1
            player.stats.record_round(round_score)
            print(f"    {Color.BOLD}{Color.YELLOW}SUDDEN DEATH - Treffer! {player.name} gewinnt!{Color.RESET}")
            return True

    player.score -= round_score
    player.rounds += 1
    player.stats.record_round(round_score)
    print(f"    Neuer Stand: {Color.info(f'{player.score} Punkte')}")
    return False


def play_custom_game(players, rules):
    board = DartBoard()
    start_score = rules["start_score"]
    has_started_scoring = {p.name: not rules["double_in"] for p in players}

    for p in players:
        if p.name not in rules["handicap"]:
            p.score = start_score
        p.darts_thrown = 0
        p.rounds = 0
        p.stats = Statistics()

    print(Color.success(f"\nCustom-Spiel startet! Score: {start_score}"))

    while True:
        display_scoreboard(players)

        if rules["mercy_rule"] > 0 and len(players) == 2:
            diff = abs(players[0].score - players[1].score)
            if diff >= rules["mercy_rule"]:
                leader = min(players, key=lambda p: p.score)
                print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
                print(f"  GNADE-REGEL! Differenz: {diff}")
                print(f"  {leader.name} gewinnt!")
                print(f"{'*' * 44}{Color.RESET}")
                return leader

        for player in players:
            won = play_custom_round(player, board, rules, has_started_scoring)
            if won or player.score == 0:
                print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
                print(f"  {player.name} GEWINNT mit {player.darts_thrown} Darts!")
                print(f"{'*' * 44}{Color.RESET}")
                return player


def custom_game_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'CUSTOM GAME':^50}"))
    print(Color.muted("=" * 50))

    rules = configure_rules()
    players = setup_custom_players(rules)
    winner = play_custom_game(players, rules)

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{'ENDSTATISTIKEN':^44}"))
    print(Color.muted("═" * 44))
    for p in players:
        p.stats.display(p.name)

    try:
        from profiles import ProfileManager
        for p in players:
            if not p.is_cpu:
                ProfileManager.update_after_game(
                    p.name, p.stats,
                    won=(p.name == winner.name),
                    busts=p.stats.busts,
                    darts=p.darts_thrown,
                )
    except ImportError:
        pass
