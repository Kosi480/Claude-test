#!/usr/bin/env python3
"""World Tour: Globale Dart-Reise mit länderspezifischen Herausforderungen."""

import json
import os
from dart_game import DartBoard, Color, throw_animation

TOUR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "world_tour_data.json")

COUNTRIES = [
    {
        "name": "England",
        "flag": "EN",
        "city": "London - Ally Pally",
        "challenge": "classic_501",
        "desc": "Klassisches 501 in unter 24 Darts",
        "target_darts": 24,
        "stars_thresholds": [30, 24, 18],
    },
    {
        "name": "Niederlande",
        "flag": "NL",
        "city": "Amsterdam",
        "challenge": "high_scoring",
        "desc": "Erziele 300+ Punkte in 5 Runden",
        "target_score": 300,
        "rounds": 5,
        "stars_thresholds": [250, 300, 400],
    },
    {
        "name": "Deutschland",
        "flag": "DE",
        "city": "Frankfurt",
        "challenge": "doubles",
        "desc": "Triff 5 Doubles in 15 Darts",
        "target_doubles": 5,
        "max_darts": 15,
        "stars_thresholds": [3, 5, 8],
    },
    {
        "name": "Australien",
        "flag": "AU",
        "city": "Melbourne",
        "challenge": "triples",
        "desc": "Erziele 200+ Triple-Punkte in 10 Darts",
        "target_triple_pts": 200,
        "max_darts": 10,
        "stars_thresholds": [150, 200, 300],
    },
    {
        "name": "Japan",
        "flag": "JP",
        "city": "Tokio",
        "challenge": "precision",
        "desc": "Triff 3 Bulls in 10 Darts",
        "target_bulls": 3,
        "max_darts": 10,
        "stars_thresholds": [2, 3, 5],
    },
    {
        "name": "USA",
        "flag": "US",
        "city": "Las Vegas",
        "challenge": "big_score",
        "desc": "Wirf 3 Runden mit 100+ Punkten",
        "target_hundreds": 3,
        "rounds": 6,
        "stars_thresholds": [2, 3, 5],
    },
    {
        "name": "Schottland",
        "flag": "SC",
        "city": "Aberdeen",
        "challenge": "consistency",
        "desc": "6 Runden alle über 40 Punkte",
        "min_per_round": 40,
        "rounds": 6,
        "stars_thresholds": [4, 6, 6],
    },
    {
        "name": "Brasilien",
        "flag": "BR",
        "city": "Sao Paulo",
        "challenge": "variety",
        "desc": "Triff 10 verschiedene Zahlen in 15 Darts",
        "target_variety": 10,
        "max_darts": 15,
        "stars_thresholds": [7, 10, 14],
    },
]


def parse_throw_info(result, points):
    if result == "Bullseye":
        return {"number": 25, "type": "bullseye", "points": 50, "is_bull": True, "is_double": True, "is_triple": False}
    elif result == "Bull":
        return {"number": 25, "type": "bull", "points": 25, "is_bull": True, "is_double": False, "is_triple": False}
    elif result == "Miss":
        return {"number": 0, "type": "miss", "points": 0, "is_bull": False, "is_double": False, "is_triple": False}

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return {"number": 0, "type": "miss", "points": 0, "is_bull": False, "is_double": False, "is_triple": False}
        is_triple = parts[0] == "Triple"
        is_double = parts[0] == "Double"
        return {"number": num, "type": parts[0].lower(), "points": points, "is_bull": False, "is_double": is_double, "is_triple": is_triple}
    elif len(parts) == 1:
        try:
            num = int(parts[0])
            return {"number": num, "type": "single", "points": points, "is_bull": False, "is_double": False, "is_triple": False}
        except ValueError:
            pass

    return {"number": 0, "type": "miss", "points": 0, "is_bull": False, "is_double": False, "is_triple": False}


def play_challenge(board, country):
    challenge = country["challenge"]

    if challenge == "classic_501":
        return play_classic_501(board, country)
    elif challenge == "high_scoring":
        return play_high_scoring(board, country)
    elif challenge == "doubles":
        return play_doubles(board, country)
    elif challenge == "triples":
        return play_triples(board, country)
    elif challenge == "precision":
        return play_precision(board, country)
    elif challenge == "big_score":
        return play_big_score(board, country)
    elif challenge == "consistency":
        return play_consistency(board, country)
    elif challenge == "variety":
        return play_variety(board, country)
    return 0


def play_classic_501(board, country):
    score = 501
    darts = 0
    while score > 0 and darts < 50:
        round_score = 0
        for _ in range(3):
            input(f"    [{score - round_score}] Dart [Enter]...")
            throw_animation()
            result, points = board.throw()
            darts += 1
            info = parse_throw_info(result, points)
            if score - round_score - points < 0:
                print(f"      -> {Color.colorize_result(result, points)} {Color.RED}BUST{Color.RESET}")
                round_score = 0
                break
            round_score += points
            print(f"      -> {Color.colorize_result(result, points)}")
            if score - round_score == 0:
                break
        score -= round_score
        if score == 0:
            break
    return darts if score == 0 else 50


def play_high_scoring(board, country):
    total = 0
    for r in range(country["rounds"]):
        round_score = 0
        for _ in range(3):
            input(f"    Runde {r+1} [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_score += points
            print(f"      -> {Color.colorize_result(result, points)}")
        total += round_score
        print(f"    Runde: {round_score} | Gesamt: {total}")
    return total


def play_doubles(board, country):
    doubles = 0
    for d in range(country["max_darts"]):
        input(f"    Dart {d+1}/{country['max_darts']} [Enter]...")
        throw_animation()
        result, points = board.throw()
        info = parse_throw_info(result, points)
        if info["is_double"]:
            doubles += 1
            print(f"      -> {Color.colorize_result(result, points)} {Color.success('DOUBLE!')}")
        else:
            print(f"      -> {Color.colorize_result(result, points)}")
    return doubles


def play_triples(board, country):
    triple_pts = 0
    for d in range(country["max_darts"]):
        input(f"    Dart {d+1}/{country['max_darts']} [Enter]...")
        throw_animation()
        result, points = board.throw()
        info = parse_throw_info(result, points)
        if info["is_triple"]:
            triple_pts += points
            print(f"      -> {Color.colorize_result(result, points)} {Color.success('TRIPLE!')}")
        else:
            print(f"      -> {Color.colorize_result(result, points)}")
    return triple_pts


def play_precision(board, country):
    bulls = 0
    for d in range(country["max_darts"]):
        input(f"    Dart {d+1}/{country['max_darts']} [Enter]...")
        throw_animation()
        result, points = board.throw()
        info = parse_throw_info(result, points)
        if info["is_bull"]:
            bulls += 1
            print(f"      -> {Color.colorize_result(result, points)} {Color.success('BULL!')}")
        else:
            print(f"      -> {Color.colorize_result(result, points)}")
    return bulls


def play_big_score(board, country):
    hundreds = 0
    for r in range(country["rounds"]):
        round_score = 0
        for _ in range(3):
            input(f"    Runde {r+1} [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_score += points
            print(f"      -> {Color.colorize_result(result, points)}")
        if round_score >= 100:
            hundreds += 1
            print(f"    {Color.success(f'100+ Runde! ({round_score})')}")
        else:
            print(f"    Runde: {round_score}")
    return hundreds


def play_consistency(board, country):
    rounds_over_min = 0
    for r in range(country["rounds"]):
        round_score = 0
        for _ in range(3):
            input(f"    Runde {r+1} [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_score += points
            print(f"      -> {Color.colorize_result(result, points)}")
        if round_score >= country["min_per_round"]:
            rounds_over_min += 1
            print(f"    {Color.GREEN}{round_score} ✓{Color.RESET}")
        else:
            print(f"    {Color.RED}{round_score} ✗{Color.RESET}")
    return rounds_over_min


def play_variety(board, country):
    hit_numbers = set()
    for d in range(country["max_darts"]):
        input(f"    Dart {d+1}/{country['max_darts']} [Enter]...")
        throw_animation()
        result, points = board.throw()
        info = parse_throw_info(result, points)
        if info["number"] > 0:
            hit_numbers.add(info["number"])
        print(f"      -> {Color.colorize_result(result, points)} "
              f"({len(hit_numbers)} verschiedene)")
    return len(hit_numbers)


def calc_stars(result, thresholds, challenge):
    if challenge == "classic_501":
        if result <= thresholds[2]:
            return 3
        elif result <= thresholds[1]:
            return 2
        elif result <= thresholds[0]:
            return 1
        return 0
    else:
        if result >= thresholds[2]:
            return 3
        elif result >= thresholds[1]:
            return 2
        elif result >= thresholds[0]:
            return 1
        return 0


def load_tour_progress():
    if os.path.exists(TOUR_FILE):
        try:
            with open(TOUR_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_tour_progress(data):
    try:
        with open(TOUR_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except (IOError, OSError):
        pass


def run_world_tour(player_name):
    board = DartBoard()
    progress = load_tour_progress()
    player_prog = progress.get(player_name, {})

    print(f"\n{Color.muted('═' * 52)}")
    print(Color.title(f"{'DART WORLD TOUR':^52}"))
    print(f"{Color.muted('═' * 52)}")
    print(f"  Spieler: {Color.BOLD}{player_name}{Color.RESET}")

    total_stars = sum(player_prog.get(c["name"], {}).get("stars", 0) for c in COUNTRIES)
    max_stars = len(COUNTRIES) * 3
    print(f"  Sterne:  {total_stars}/{max_stars}")
    print(f"{Color.muted('═' * 52)}")

    for i, country in enumerate(COUNTRIES):
        cp = player_prog.get(country["name"], {})
        stars = cp.get("stars", 0)
        star_str = f"{'★' * stars}{'☆' * (3 - stars)}"

        if stars == 3:
            status = f"{Color.YELLOW}{star_str}{Color.RESET}"
        elif stars > 0:
            status = f"{Color.GREEN}{star_str}{Color.RESET}"
        else:
            status = f"{Color.muted(star_str)}"

        print(f"  {i+1:>2}) [{country['flag']}] {country['city']:<24} {status}")

    print(f"\n  Welches Land? (1-{len(COUNTRIES)}, 0=Zurück)")
    choice = input("  Wahl: ").strip()

    try:
        idx = int(choice) - 1
        if idx < 0 or idx >= len(COUNTRIES):
            return
    except ValueError:
        return

    country = COUNTRIES[idx]

    print(f"\n  {Color.BOLD}[{country['flag']}] {country['city']}{Color.RESET}")
    print(f"  {Color.info(country['desc'])}")

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    result = play_challenge(board, country)

    stars = calc_stars(result, country["stars_thresholds"], country["challenge"])
    star_str = f"{'★' * stars}{'☆' * (3 - stars)}"

    prev_stars = player_prog.get(country["name"], {}).get("stars", 0)
    if stars > prev_stars:
        if country["name"] not in player_prog:
            player_prog[country["name"]] = {}
        player_prog[country["name"]]["stars"] = stars
        player_prog[country["name"]]["best_result"] = result
        progress[player_name] = player_prog
        save_tour_progress(progress)

        if prev_stars == 0:
            print(f"\n  {Color.YELLOW}Neuer Rekord! {star_str}{Color.RESET}")
        else:
            print(f"\n  {Color.YELLOW}Verbesserung! {star_str}{Color.RESET}")
    else:
        print(f"\n  Ergebnis: {star_str}")

    if stars == 3:
        print(f"  {Color.success('Perfekte Wertung!')}")
    elif stars >= 1:
        print(f"  {Color.info('Weiter so!')}")
    else:
        print(f"  {Color.muted('Nächstes Mal klappts!')}")


def world_tour_menu():
    print(Color.muted("=" * 52))
    print(Color.title(f"{'DART WORLD TOUR':^52}"))
    print(Color.muted("=" * 52))

    print(f"\n  {Color.info('Reise um die Welt und meistere Dart-Challenges!')}")
    print("  8 Länder, je 3 Sterne zu holen.\n")

    name = input("  Dein Name: ").strip() or "Tourist"

    run_world_tour(name)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
