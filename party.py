#!/usr/bin/env python3
"""Party-Modus: Multiplayer-Minigames mit Elimination."""

import random
from dart_game import DartBoard, Color, throw_animation


CHALLENGES = [
    {
        "name": "Höchster Wurf",
        "desc": "Jeder wirft 1 Dart. Höchste Punktzahl gewinnt.",
        "darts": 1,
        "score": "max_points",
    },
    {
        "name": "Niedrigster Wurf",
        "desc": "Jeder wirft 1 Dart. Niedrigste Punktzahl (>0) gewinnt.",
        "darts": 1,
        "score": "min_points",
    },
    {
        "name": "Dreier-Runde",
        "desc": "3 Darts. Wer hat die meisten Punkte?",
        "darts": 3,
        "score": "max_points",
    },
    {
        "name": "Gerade Zahlen",
        "desc": "3 Darts. Nur gerade Zahlen zählen!",
        "darts": 3,
        "score": "even_only",
    },
    {
        "name": "Ungerade Zahlen",
        "desc": "3 Darts. Nur ungerade Zahlen zählen!",
        "darts": 3,
        "score": "odd_only",
    },
    {
        "name": "Double-Jäger",
        "desc": "3 Darts. Nur Doubles zählen!",
        "darts": 3,
        "score": "doubles_only",
    },
    {
        "name": "Triple-Jäger",
        "desc": "3 Darts. Nur Triples zählen!",
        "darts": 3,
        "score": "triples_only",
    },
    {
        "name": "Bull-Rush",
        "desc": "2 Darts. Nur Bull/Bullseye zählen!",
        "darts": 2,
        "score": "bull_only",
    },
    {
        "name": "Unter 20",
        "desc": "3 Darts. Nur Treffer auf 1-10 zählen!",
        "darts": 3,
        "score": "low_numbers",
    },
    {
        "name": "Über 15",
        "desc": "3 Darts. Nur Treffer auf 16-20 zählen!",
        "darts": 3,
        "score": "high_numbers",
    },
]


def parse_result(result, points):
    if result == "Bullseye":
        return {"type": "bullseye", "number": 25, "points": 50}
    elif result == "Bull":
        return {"type": "bull", "number": 25, "points": 25}
    elif result == "Miss":
        return {"type": "miss", "number": 0, "points": 0}

    parts = result.split()
    if len(parts) == 2:
        try:
            num = int(parts[1])
        except ValueError:
            return {"type": "miss", "number": 0, "points": 0}
        if parts[0] == "Triple":
            return {"type": "triple", "number": num, "points": points}
        elif parts[0] == "Double":
            return {"type": "double", "number": num, "points": points}
    elif len(parts) == 1:
        try:
            num = int(parts[0])
            return {"type": "single", "number": num, "points": points}
        except ValueError:
            pass
    return {"type": "miss", "number": 0, "points": 0}


def calc_score(throws, score_type):
    if score_type == "max_points":
        return sum(t["points"] for t in throws)
    elif score_type == "min_points":
        pts = sum(t["points"] for t in throws)
        return -pts if pts > 0 else -9999
    elif score_type == "even_only":
        return sum(t["points"] for t in throws if t["number"] % 2 == 0 and t["number"] > 0)
    elif score_type == "odd_only":
        return sum(t["points"] for t in throws if t["number"] % 2 == 1)
    elif score_type == "doubles_only":
        return sum(t["points"] for t in throws if t["type"] == "double")
    elif score_type == "triples_only":
        return sum(t["points"] for t in throws if t["type"] == "triple")
    elif score_type == "bull_only":
        return sum(t["points"] for t in throws if t["type"] in ("bull", "bullseye"))
    elif score_type == "low_numbers":
        return sum(t["points"] for t in throws if 1 <= t["number"] <= 10)
    elif score_type == "high_numbers":
        return sum(t["points"] for t in throws if 16 <= t["number"] <= 20)
    return 0


def play_challenge(board, players, challenge):
    print(f"\n  {Color.BOLD}{Color.MAGENTA}{'─' * 44}")
    print(f"  {challenge['name']:^44}")
    print(f"  {Color.muted(challenge['desc'])}")
    print(f"  {'─' * 44}{Color.RESET}")

    scores = {}
    for player in players:
        print(f"\n    {Color.BOLD}{player}{Color.RESET} wirft:")
        throws = []
        for d in range(1, challenge["darts"] + 1):
            input(f"      Dart {d}/{challenge['darts']} [Enter]...")
            throw_animation()
            result, points = board.throw()
            parsed = parse_result(result, points)
            throws.append(parsed)
            print(f"        -> {Color.colorize_result(result, points)}")

        score = calc_score(throws, challenge["score"])
        scores[player] = score

    display_scores = {}
    for p, s in scores.items():
        display_scores[p] = -s if challenge["score"] == "min_points" else s

    sorted_players = sorted(scores.items(), key=lambda x: -x[1])

    print(f"\n  {Color.muted('Ergebnis:')}")
    for i, (name, score) in enumerate(sorted_players):
        display = display_scores[name]
        if i == 0:
            print(f"    {Color.GREEN}1.{Color.RESET} {Color.BOLD}{name}{Color.RESET}: "
                  f"{Color.BOLD}{display}{Color.RESET} Punkte {Color.success('★')}")
        else:
            print(f"    {i + 1}. {name}: {display} Punkte")

    winner = sorted_players[0][0]
    loser = sorted_players[-1][0]
    return winner, loser


def run_party_mode(player_names):
    board = DartBoard()
    active = list(player_names)
    scores = {p: 0 for p in player_names}
    round_num = 0

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'PARTY-MODUS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Spieler: {', '.join(player_names)}")
    print(f"  Modus: Zufällige Herausforderungen")
    print(f"  Letzter Platz wird eliminiert!")
    print(f"{Color.muted('═' * 50)}")

    available = list(CHALLENGES)
    random.shuffle(available)

    while len(active) > 1:
        round_num += 1

        if not available:
            available = list(CHALLENGES)
            random.shuffle(available)

        challenge = available.pop()

        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ Runde {round_num} ═══{Color.RESET}")
        print(f"  Noch dabei: {', '.join(active)}")

        winner, loser = play_challenge(board, active, challenge)
        scores[winner] += 3

        for p in active:
            if p != winner and p != loser:
                scores[p] += 1

        if len(active) > 2:
            print(f"\n  {Color.RED}{Color.BOLD}{loser} ist ELIMINIERT!{Color.RESET}")
            active.remove(loser)
        else:
            if scores[winner] >= scores[loser]:
                active.remove(loser)
            else:
                active.remove(winner)

        print(f"\n  {Color.muted('Punktestand:')}")
        for p in sorted(scores.items(), key=lambda x: -x[1]):
            name, pts = p
            status = f" {Color.GREEN}[dabei]{Color.RESET}" if name in active else f" {Color.RED}[raus]{Color.RESET}"
            print(f"    {name}: {Color.BOLD}{pts}{Color.RESET} Pkt{status}")

        if len(active) > 1:
            input(Color.muted("\n  [Enter] für nächste Runde..."))

    champion = active[0]

    print(f"\n{Color.BOLD}{Color.YELLOW}")
    print(f"  {'🎉' * 15}")
    print(f"  {'':^50}")
    print(f"  {'PARTY-CHAMPION':^50}")
    print(f"  {champion:^50}")
    print(f"  {f'{scores[champion]} Punkte':^50}")
    print(f"  {'':^50}")
    print(f"  {'🎉' * 15}")
    print(f"{Color.RESET}")

    print(f"\n  {Color.BOLD}Endstand:{Color.RESET}")
    final = sorted(scores.items(), key=lambda x: -x[1])
    medals = ["🥇", "🥈", "🥉"]
    for i, (name, pts) in enumerate(final):
        medal = medals[i] if i < 3 else f"  {i+1}."
        print(f"    {medal} {name} - {pts} Punkte")

    return champion


def party_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'PARTY-MODUS':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Zufällige Mini-Challenges mit Elimination!')}")
    print("  3-6 Spieler empfohlen.\n")

    try:
        num = int(input("  Anzahl Spieler (2-8): ").strip())
        num = max(2, min(8, num))
    except ValueError:
        num = 4

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_party_mode(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
