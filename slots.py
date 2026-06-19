#!/usr/bin/env python3
"""Dart Slots: Spielautomaten-Minispiel mit Dartwürfen."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number

SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"]
SYMBOL_NAMES = ["Kirsche", "Zitrone", "Glocke", "Stern", "Diamant", "Sieben"]
SYMBOL_VALUES = [2, 3, 5, 10, 25, 50]

PAYOUTS = {
    (0, 0, 0): ("3x Kirsche", 10),
    (1, 1, 1): ("3x Zitrone", 15),
    (2, 2, 2): ("3x Glocke", 30),
    (3, 3, 3): ("3x Stern", 75),
    (4, 4, 4): ("3x Diamant", 200),
    (5, 5, 5): ("JACKPOT 7-7-7!", 500),
}


def dart_to_reel(hit_num, hit_type):
    if hit_num == 0:
        return random.randint(0, 5)
    idx = hit_num % len(SYMBOLS)
    if hit_type == "triple":
        return 5
    elif hit_type == "double":
        return min(idx + 1, 5)
    return idx


def display_reels(reels, spinning=None):
    if spinning is None:
        spinning = []
    top = "  ┌───────┬───────┬───────┐"
    mid = "  │"
    bot = "  └───────┴───────┴───────┘"

    print(top)
    for i in range(3):
        if i in spinning:
            mid += "  ???  │"
        else:
            mid += f"  {SYMBOLS[reels[i]]}   │"
    print(mid)
    print(bot)


def check_payout(reels):
    key = tuple(reels)
    if key in PAYOUTS:
        return PAYOUTS[key]

    if reels[0] == reels[1] or reels[1] == reels[2] or reels[0] == reels[2]:
        return ("Ein Paar!", 5)

    return ("Nichts", 0)


def run_slots():
    board = DartBoard()

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{'DART SLOTS':^44}"))
    print(f"{Color.muted('═' * 44)}")
    print(f"  {Color.info('Regeln:')}")
    print("    Du startest mit 100 Credits.")
    print("    Jede Runde kostet 10 Credits.")
    print("    Wirf 3 Darts um die Walzen zu drehen!")
    print("    Trefferzahl bestimmt das Symbol.")
    print("    Triple = Sieben (Jackpot-Symbol)")
    print("    Double = naechsthoeheres Symbol")
    print()
    print("    Auszahlungen:")
    print("    3x Kirsche = 10   3x Zitrone = 15")
    print("    3x Glocke  = 30   3x Stern   = 75")
    print("    3x Diamant = 200  3x Sieben  = 500")
    print("    Ein Paar   = 5")
    print(f"{Color.muted('═' * 44)}")

    credits = 100
    max_credits = 100
    spins = 0

    while credits >= 10:
        print(f"\n  Credits: {Color.YELLOW}{credits}{Color.RESET} "
              f"| Runden: {spins} | Max: {max_credits}")

        choice = input("  [Enter] zum Drehen (q=Aufhoeren): ").strip().lower()
        if choice == "q":
            break

        credits -= 10
        spins += 1
        reels = [0, 0, 0]

        print(f"\n  {Color.BOLD}Drehe die Walzen...{Color.RESET}")

        for reel_idx in range(3):
            spinning = list(range(reel_idx + 1, 3))
            if reel_idx < 2:
                display_reels(reels, spinning)

            input(f"    Walze {reel_idx + 1}/3 - [Enter] zum Werfen...")
            throw_animation()
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            reels[reel_idx] = dart_to_reel(hit_num, hit_type)
            sym = SYMBOLS[reels[reel_idx]]

            print(f"    -> {Color.colorize_result(result, points)} "
                  f"= {sym} {SYMBOL_NAMES[reels[reel_idx]]}")

        print(f"\n  {Color.BOLD}Ergebnis:{Color.RESET}")
        display_reels(reels)

        name, payout = check_payout(reels)
        if payout > 0:
            credits += payout
            max_credits = max(max_credits, credits)
            if payout >= 200:
                print(f"  {Color.BOLD}{Color.YELLOW}{'*' * 30}")
                print(f"  {name} = +{payout} Credits!")
                print(f"  {'*' * 30}{Color.RESET}")
            elif payout >= 30:
                print(f"  {Color.GREEN}{Color.BOLD}{name} = +{payout} Credits!{Color.RESET}")
            else:
                print(f"  {Color.GREEN}{name} = +{payout} Credits{Color.RESET}")
        else:
            print(f"  {Color.muted(name)}")

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{'SLOTS ERGEBNIS':^44}"))
    print(f"{Color.muted('═' * 44)}")
    print(f"  Runden gespielt: {Color.BOLD}{spins}{Color.RESET}")
    print(f"  Credits uebrig:  {Color.YELLOW}{credits}{Color.RESET}")
    print(f"  Max Credits:     {Color.BOLD}{max_credits}{Color.RESET}")
    profit = credits - 100
    if profit > 0:
        print(f"  Gewinn: {Color.GREEN}+{profit}{Color.RESET}")
    elif profit < 0:
        print(f"  Verlust: {Color.RED}{profit}{Color.RESET}")
    else:
        print(f"  Ausgeglichen!")
    print(f"{Color.muted('═' * 44)}")


def slots_menu():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'DART SLOTS':^44}"))
    print(Color.muted("=" * 44))

    print(f"\n  {Color.info('Spielautomaten mit Dartwuerfen!')}")
    print("  Drehe 3 Walzen und gewinne Credits.\n")

    print("    1) Spiel starten")
    print("    2) Zurueck")

    choice = input("  Wahl (1-2): ").strip()
    if choice == "1":
        run_slots()
        input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
