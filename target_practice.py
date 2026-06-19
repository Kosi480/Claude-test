#!/usr/bin/env python3
"""Target Practice: Gezieltes Training auf bestimmte Segmente."""

from dart_game import DartBoard, Color, throw_animation


TARGETS = {
    "t20": {"label": "Triple 20", "match": lambda r, _: r == "Triple 20", "points": 60},
    "t19": {"label": "Triple 19", "match": lambda r, _: r == "Triple 19", "points": 57},
    "t18": {"label": "Triple 18", "match": lambda r, _: r == "Triple 18", "points": 54},
    "d20": {"label": "Double 20", "match": lambda r, _: r == "Double 20", "points": 40},
    "d16": {"label": "Double 16", "match": lambda r, _: r == "Double 16", "points": 32},
    "d10": {"label": "Double 10", "match": lambda r, _: r == "Double 10", "points": 20},
    "d8":  {"label": "Double 8", "match": lambda r, _: r == "Double 8", "points": 16},
    "bull": {"label": "Bullseye", "match": lambda r, _: r == "Bullseye", "points": 50},
    "25":  {"label": "Bull (25)", "match": lambda r, _: r in ("Bull", "Bullseye"), "points": 25},
    "s20": {"label": "Single 20", "match": lambda r, _: r == "20", "points": 20},
}

PRESET_SESSIONS = {
    "checkout": {
        "name": "Checkout-Training",
        "desc": "Die wichtigsten Checkout-Doubles",
        "targets": ["d20", "d16", "d10", "d8"],
        "darts_each": 10,
    },
    "scoring": {
        "name": "Scoring-Training",
        "desc": "Treble 20, 19, 18 für maximale Punkte",
        "targets": ["t20", "t19", "t18"],
        "darts_each": 15,
    },
    "bullseye": {
        "name": "Bullseye-Training",
        "desc": "Bull und Bullseye unter Druck",
        "targets": ["bull", "25"],
        "darts_each": 20,
    },
}


def run_target_session(target_key, num_darts):
    target = TARGETS[target_key]
    board = DartBoard()

    print(f"\n  {Color.BOLD}Ziel: {Color.YELLOW}{target['label']}{Color.RESET}")
    print(f"  Darts: {num_darts}")
    print(f"  {Color.muted('─' * 36)}")

    hits = 0
    near_misses = 0
    total_points = 0

    for d in range(1, num_darts + 1):
        input(f"  Dart {d}/{num_darts} [Enter]...")
        throw_animation()
        result, points = board.throw()

        is_hit = target["match"](result, points)

        if is_hit:
            hits += 1
            total_points += points
            print(f"    -> {Color.colorize_result(result, points)} "
                  f"{Color.success('TREFFER!')} ({hits}/{d})")
        else:
            total_points += points
            near = _is_near_miss(result, target_key)
            if near:
                near_misses += 1
                print(f"    -> {Color.colorize_result(result, points)} "
                      f"{Color.warning('Knapp daneben!')}")
            else:
                print(f"    -> {Color.colorize_result(result, points)}")

    accuracy = (hits / num_darts * 100) if num_darts > 0 else 0

    print(f"\n  {Color.muted('═' * 36)}")
    print(f"  {Color.BOLD}Ergebnis: {target['label']}{Color.RESET}")
    print(f"  Treffer:      {Color.BOLD}{hits}/{num_darts}{Color.RESET} ({accuracy:.1f}%)")
    print(f"  Knapp daneben: {near_misses}")
    print(f"  Gesamtpunkte: {total_points}")

    if accuracy >= 20:
        grade = "Ausgezeichnet!"
        color_fn = Color.success
    elif accuracy >= 10:
        grade = "Gut"
        color_fn = Color.info
    elif accuracy >= 5:
        grade = "Ordentlich"
        color_fn = lambda x: x
    else:
        grade = "Weiter üben!"
        color_fn = Color.muted

    print(f"  Bewertung:    {color_fn(grade)}")
    print(f"  {Color.muted('═' * 36)}")

    return {"target": target_key, "hits": hits, "darts": num_darts, "accuracy": accuracy}


def _is_near_miss(result, target_key):
    parts = result.split()
    if target_key.startswith("t"):
        num = target_key[1:]
        if len(parts) >= 1 and (parts[-1] == num if len(parts) <= 2 else False):
            return True
        if result == num or (len(parts) == 2 and parts[0] == "Double" and parts[1] == num):
            return True
    elif target_key.startswith("d"):
        num = target_key[1:]
        if result == num or (len(parts) == 2 and parts[0] == "Triple" and parts[1] == num):
            return True
    elif target_key == "bull":
        if result == "Bull":
            return True
    elif target_key == "25":
        return False
    return False


def run_preset_session(preset_key):
    preset = PRESET_SESSIONS[preset_key]

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{preset['name']:^44}"))
    print(f"{Color.muted('═' * 44)}")
    print(f"  {Color.info(preset['desc'])}")
    print(f"  {len(preset['targets'])} Ziele, je {preset['darts_each']} Darts")

    results = []
    for tkey in preset["targets"]:
        result = run_target_session(tkey, preset["darts_each"])
        results.append(result)

    total_hits = sum(r["hits"] for r in results)
    total_darts = sum(r["darts"] for r in results)
    overall_acc = (total_hits / total_darts * 100) if total_darts > 0 else 0

    print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
    print(f"  {preset['name'].upper()} ABGESCHLOSSEN!")
    print(f"  Gesamt: {total_hits}/{total_darts} ({overall_acc:.1f}%)")
    print(f"{'*' * 44}{Color.RESET}")

    print(f"\n  Zusammenfassung:")
    for r in results:
        tgt = TARGETS[r["target"]]["label"]
        bar_len = int(r["accuracy"] / 2)
        bar = "█" * max(bar_len, 0)
        print(f"    {tgt:<14} {bar} {r['accuracy']:.1f}% ({r['hits']}/{r['darts']})")


def target_practice_menu():
    print(Color.muted("=" * 44))
    print(Color.title(f"{'TARGET PRACTICE':^44}"))
    print(Color.muted("=" * 44))

    print("\n  Trainingsmodus:")
    print("    1) Einzelnes Ziel wählen")
    print("    2) Checkout-Training (D20, D16, D10, D8)")
    print("    3) Scoring-Training (T20, T19, T18)")
    print("    4) Bullseye-Training")
    print("    5) Zurück")

    while True:
        choice = input("  Wahl (1-5): ").strip()

        if choice == "5":
            return
        elif choice == "1":
            print("\n  Verfügbare Ziele:")
            keys = list(TARGETS.keys())
            for i, key in enumerate(keys, 1):
                print(f"    {i:>2}) {TARGETS[key]['label']}")

            try:
                idx = int(input("  Ziel (Nr): ").strip()) - 1
                if idx < 0 or idx >= len(keys):
                    continue
            except ValueError:
                continue

            try:
                num = int(input("  Anzahl Darts (5-50): ").strip())
                num = max(5, min(50, num))
            except ValueError:
                num = 15

            run_target_session(keys[idx], num)
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        elif choice == "2":
            run_preset_session("checkout")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "3":
            run_preset_session("scoring")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "4":
            run_preset_session("bullseye")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return

        print("  Bitte 1-5 wählen.")
