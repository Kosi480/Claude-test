#!/usr/bin/env python3
"""Dart Survival: Wellen-basierter Modus mit steigenden Ziel-Kombos."""

import random
from dart_game import DartBoard, Color, throw_animation


def generate_wave(wave_num):
    targets = []
    difficulty = min(wave_num, 10)

    if difficulty <= 2:
        pool = [(str(n), f"Single {n}") for n in range(10, 21)]
        count = 2 + wave_num
    elif difficulty <= 4:
        pool = (
            [(str(n), f"Single {n}") for n in range(1, 21)]
            + [(f"Double {n}", f"Double {n}") for n in [10, 16, 20]]
        )
        count = 3 + wave_num // 2
    elif difficulty <= 6:
        pool = (
            [(f"Double {n}", f"Double {n}") for n in range(1, 21)]
            + [(f"Triple {n}", f"Triple {n}") for n in [18, 19, 20]]
            + [("Bull", "Bull"), ("Bullseye", "Bullseye")]
        )
        count = 3 + wave_num // 3
    else:
        pool = (
            [(f"Triple {n}", f"Triple {n}") for n in range(1, 21)]
            + [(f"Double {n}", f"Double {n}") for n in range(1, 21)]
            + [("Bullseye", "Bullseye")]
        )
        count = 4 + wave_num // 4

    count = min(count, 8)
    selected = random.sample(pool, min(count, len(pool)))
    for match_str, label in selected:
        targets.append({"match": match_str, "label": label, "hit": False})

    return targets


def check_hit(result, target_match):
    return result == target_match


def run_survival():
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART SURVIVAL':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Überlebe so viele Wellen wie möglich!')}")
    print(f"  Jede Welle bringt neue Ziele zum Treffen.")
    print(f"  Nicht alle Ziele geschafft = Game Over!")
    print(f"{Color.muted('═' * 50)}")

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    wave = 0
    total_darts = 0
    total_hits = 0
    perfect_waves = 0

    while True:
        wave += 1
        targets = generate_wave(wave)
        max_darts = len(targets) + wave + 2

        print(f"\n  {Color.BOLD}{Color.YELLOW}═══ WELLE {wave} ═══{Color.RESET}")
        print(f"  Ziele: {len(targets)} | Darts: {max_darts}")
        print(f"  {Color.muted('─' * 40)}")

        for t in targets:
            print(f"    [ ] {t['label']}")

        darts_used = 0
        all_hit = False

        while darts_used < max_darts:
            remaining_targets = [t for t in targets if not t["hit"]]
            if not remaining_targets:
                all_hit = True
                break

            remaining_labels = ", ".join(t["label"] for t in remaining_targets)
            darts_left = max_darts - darts_used
            print(f"\n  Übrig: {Color.CYAN}{remaining_labels}{Color.RESET} | "
                  f"Darts: {darts_left}")

            input(f"  Dart [Enter]...")
            throw_animation()
            result, points = board.throw()
            darts_used += 1
            total_darts += 1

            hit_target = None
            for t in targets:
                if not t["hit"] and check_hit(result, t["match"]):
                    t["hit"] = True
                    hit_target = t
                    total_hits += 1
                    break

            if hit_target:
                hit_label = hit_target["label"]
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"{Color.success(f'TREFFER: {hit_label}!')}")
            else:
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"{Color.muted('Kein Ziel getroffen')}")

        hits_in_wave = sum(1 for t in targets if t["hit"])
        missed = [t for t in targets if not t["hit"]]

        if all_hit:
            if darts_used <= len(targets):
                perfect_waves += 1
                print(f"\n  {Color.BOLD}{Color.YELLOW}PERFEKTE WELLE! "
                      f"({darts_used} Darts für {len(targets)} Ziele){Color.RESET}")
            else:
                print(f"\n  {Color.success(f'Welle {wave} überlebt! ({hits_in_wave}/{len(targets)})')}")
        else:
            print(f"\n  {Color.RED}{Color.BOLD}WELLE GESCHEITERT!{Color.RESET}")
            print(f"  Getroffen: {hits_in_wave}/{len(targets)}")
            if missed:
                missed_labels = ", ".join(t["label"] for t in missed)
                print(f"  Verfehlt: {Color.RED}{missed_labels}{Color.RESET}")
            break

    waves_survived = wave - 1 if not all_hit else wave

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'SURVIVAL - ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  Wellen überlebt: {Color.BOLD}{waves_survived}{Color.RESET}")
    print(f"  Perfekte Wellen: {Color.YELLOW}{perfect_waves}{Color.RESET}")
    print(f"  Darts gesamt:    {total_darts}")
    print(f"  Treffer gesamt:  {total_hits}")

    if total_darts > 0:
        accuracy = (total_hits / total_darts) * 100
        print(f"  Trefferquote:    {accuracy:.1f}%")

    if waves_survived >= 15:
        print(f"\n  {Color.BOLD}{Color.YELLOW}Bewertung: ÜBERLEBENSKÜNSTLER!{Color.RESET}")
    elif waves_survived >= 10:
        print(f"\n  {Color.success('Bewertung: Zäh wie Leder!')}")
    elif waves_survived >= 7:
        print(f"\n  {Color.success('Bewertung: Stark!')}")
    elif waves_survived >= 4:
        print(f"\n  {Color.info('Bewertung: Solide')}")
    else:
        print(f"\n  {Color.muted('Bewertung: Mehr Training nötig!')}")

    print(f"{Color.muted('═' * 50)}")
    return waves_survived


def survival_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART SURVIVAL':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Überlebe Welle für Welle!')}")
    print("  Jede Welle bringt mehr und schwierigere Ziele.")
    print("  Triff alle oder stirb!\n")

    print("    1) Survival starten")
    print("    2) Zurück")

    choice = input("  Wahl (1-2): ").strip()
    if choice == "1":
        run_survival()
        input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
