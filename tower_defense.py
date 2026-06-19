#!/usr/bin/env python3
"""Dart Tower Defense: Verteidige deine Basis mit Dartwürfen."""

import random
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number


TOWER_TYPES = {
    "single": {"name": "Wachturm", "damage": 1, "symbol": "W", "color": Color.GREEN},
    "double": {"name": "Kanone", "damage": 3, "symbol": "K", "color": Color.YELLOW},
    "triple": {"name": "Festung", "damage": 5, "symbol": "F", "color": Color.RED},
}

ENEMY_TYPES = [
    {"name": "Goblin", "hp": 2, "reward": 5, "symbol": "g"},
    {"name": "Ork", "hp": 4, "reward": 10, "symbol": "O"},
    {"name": "Troll", "hp": 7, "reward": 20, "symbol": "T"},
    {"name": "Drache", "hp": 12, "reward": 50, "symbol": "D"},
    {"name": "Boss", "hp": 20, "reward": 100, "symbol": "B"},
]


def generate_wave(wave_num):
    enemies = []
    count = min(3 + wave_num, 8)

    for _ in range(count):
        max_tier = min(wave_num // 2, len(ENEMY_TYPES) - 1)
        tier = random.randint(0, max_tier)
        enemy = dict(ENEMY_TYPES[tier])
        enemy["hp"] = int(enemy["hp"] * (1 + wave_num * 0.1))
        enemy["max_hp"] = enemy["hp"]
        enemy["position"] = random.randint(1, 20)
        enemies.append(enemy)

    return enemies


def display_battlefield(towers, enemies, base_hp, gold, wave):
    print(f"\n  {Color.BOLD}Schlachtfeld - Welle {wave}{Color.RESET}")
    print(f"  {Color.muted('─' * 44)}")

    print(f"  Basis: ", end="")
    for i in range(base_hp):
        print(f"{Color.RED}♥{Color.RESET}", end="")
    for i in range(10 - base_hp):
        print(f"{Color.muted('♡')}", end="")
    print(f"  Gold: {Color.YELLOW}{gold}{Color.RESET}")

    print(f"\n  Türme:")
    if towers:
        for seg, tower in sorted(towers.items()):
            t = TOWER_TYPES[tower["type"]]
            print(f"    Seg {seg:>2}: {t['color']}{t['symbol']} {t['name']}"
                  f" (Schaden: {t['damage']}){Color.RESET}")
    else:
        print(f"    {Color.muted('Keine Türme gebaut')}")

    print(f"\n  Feinde ({len(enemies)}):")
    if enemies:
        for e in enemies:
            hp_bar_len = 10
            filled = int(e["hp"] / e["max_hp"] * hp_bar_len)
            hp_bar = f"{Color.GREEN}{'█' * filled}{Color.muted('░' * (hp_bar_len - filled))}{Color.RESET}"
            print(f"    [{e['symbol']}] {e['name']:>8} "
                  f"HP: {hp_bar} {e['hp']}/{e['max_hp']} "
                  f"Seg: {Color.CYAN}{e['position']}{Color.RESET}")
    else:
        print(f"    {Color.GREEN}Alle besiegt!{Color.RESET}")

    print(f"  {Color.muted('─' * 44)}")


def run_tower_defense():
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART TOWER DEFENSE':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Verteidige deine Basis!')}")
    print(f"  Phase 1: Baue Türme durch Dartwürfe")
    print(f"    Single = Wachturm (1 Schaden)")
    print(f"    Double = Kanone (3 Schaden)")
    print(f"    Triple = Festung (5 Schaden)")
    print(f"  Phase 2: Feinde greifen an!")
    print(f"    Türme auf dem Segment des Feindes schaden ihm.")
    print(f"    Überlebende Feinde schaden deiner Basis.")
    print(f"  Überlebe so viele Wellen wie möglich!")
    print(f"{Color.muted('═' * 50)}")

    towers = {}
    base_hp = 10
    gold = 0
    total_kills = 0

    for wave in range(1, 21):
        if base_hp <= 0:
            break

        enemies = generate_wave(wave)

        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Welle {wave} ═══{Color.RESET}")
        print(f"  {Color.RED}{len(enemies)} Feinde nähern sich!{Color.RESET}")

        display_battlefield(towers, enemies, base_hp, gold, wave)

        build_darts = min(3 + wave // 3, 6)
        print(f"\n  {Color.BOLD}BAUPHASE{Color.RESET} - {build_darts} Darts zum Bauen")

        for dart in range(1, build_darts + 1):
            input(f"    Dart {dart}/{build_darts} [Enter]...")
            throw_animation()
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            print(f"    -> {Color.colorize_result(result, points)}", end="")

            if result == "Bullseye":
                for seg, tower in towers.items():
                    current = tower["type"]
                    if current == "single":
                        tower["type"] = "double"
                    elif current == "double":
                        tower["type"] = "triple"
                upgraded = sum(1 for _ in towers)
                print(f" - {Color.YELLOW}Alle Türme aufgewertet!{Color.RESET}")
            elif result == "Bull":
                gold += 25
                print(f" - {Color.YELLOW}+25 Gold!{Color.RESET}")
            elif result == "Miss":
                print(f" - {Color.muted('Daneben')}")
            elif hit_num > 0 and hit_type in ("single", "double", "triple"):
                if hit_num in towers:
                    old = towers[hit_num]["type"]
                    if old == "single" and hit_type in ("double", "triple"):
                        towers[hit_num]["type"] = hit_type
                        t = TOWER_TYPES[hit_type]
                        print(f" - {t['color']}Upgrade zu {t['name']}!{Color.RESET}")
                    elif old == "double" and hit_type == "triple":
                        towers[hit_num]["type"] = "triple"
                        t = TOWER_TYPES["triple"]
                        print(f" - {t['color']}Upgrade zu {t['name']}!{Color.RESET}")
                    else:
                        print(f" - {Color.muted('Turm bereits vorhanden')}")
                else:
                    towers[hit_num] = {"type": hit_type}
                    t = TOWER_TYPES[hit_type]
                    print(f" - {t['color']}{t['name']} gebaut auf Seg {hit_num}!{Color.RESET}")
            else:
                print(f" - {Color.muted('Kein Effekt')}")

        print(f"\n  {Color.BOLD}{Color.RED}KAMPFPHASE{Color.RESET}")
        display_battlefield(towers, enemies, base_hp, gold, wave)

        attack_darts = 3
        print(f"  {attack_darts} Darts zum Angreifen!")

        for dart in range(1, attack_darts + 1):
            alive_enemies = [e for e in enemies if e["hp"] > 0]
            if not alive_enemies:
                break

            input(f"    Angriff {dart}/{attack_darts} [Enter]...")
            throw_animation()
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            print(f"    -> {Color.colorize_result(result, points)}", end="")

            damage = points
            if result == "Bullseye":
                damage = 50
            elif result == "Bull":
                damage = 25

            hit_enemy = None
            for e in alive_enemies:
                if e["position"] == hit_num or result in ("Bullseye", "Bull"):
                    hit_enemy = e
                    break

            if hit_enemy:
                hit_enemy["hp"] -= damage
                if hit_enemy["hp"] <= 0:
                    hit_enemy["hp"] = 0
                    gold += hit_enemy["reward"]
                    total_kills += 1
                    print(f" - {Color.GREEN}{hit_enemy['name']} besiegt! "
                          f"+{hit_enemy['reward']} Gold{Color.RESET}")
                else:
                    print(f" - {Color.YELLOW}{hit_enemy['name']} getroffen! "
                          f"(-{damage} HP, {hit_enemy['hp']} übrig){Color.RESET}")
            else:
                print(f" - {Color.muted('Kein Feind getroffen')}")

        for seg, tower in towers.items():
            t = TOWER_TYPES[tower["type"]]
            for e in enemies:
                if e["hp"] > 0 and e["position"] == seg:
                    e["hp"] -= t["damage"]
                    if e["hp"] <= 0:
                        e["hp"] = 0
                        gold += e["reward"]
                        total_kills += 1
                        print(f"  {t['color']}{t['name']} (Seg {seg}) "
                              f"besiegt {e['name']}! +{e['reward']} Gold{Color.RESET}")
                    else:
                        print(f"  {t['color']}{t['name']} (Seg {seg}) "
                              f"trifft {e['name']} (-{t['damage']} HP){Color.RESET}")

        survivors = [e for e in enemies if e["hp"] > 0]
        if survivors:
            total_damage = len(survivors)
            base_hp -= total_damage
            base_hp = max(0, base_hp)
            names = ", ".join(e["name"] for e in survivors)
            print(f"\n  {Color.RED}{len(survivors)} Feinde erreichen die Basis! "
                  f"-{total_damage} HP{Color.RESET}")
            print(f"  {Color.muted(f'({names})')}")
        else:
            wave_bonus = wave * 5
            gold += wave_bonus
            print(f"\n  {Color.GREEN}{Color.BOLD}Welle {wave} geschafft! "
                  f"+{wave_bonus} Gold Bonus{Color.RESET}")

        if base_hp <= 0:
            break

    print(f"\n{Color.muted('═' * 50)}")
    if base_hp <= 0:
        print(Color.title(f"{'GAME OVER':^50}"))
        print(f"  {Color.RED}Deine Basis wurde zerstört!{Color.RESET}")
    else:
        print(Color.title(f"{'SIEG!':^50}"))
        print(f"  {Color.GREEN}{Color.BOLD}Alle 20 Wellen überstanden!{Color.RESET}")

    print(f"{Color.muted('═' * 50)}")
    survived = wave - 1 if base_hp <= 0 else wave
    print(f"  Wellen überlebt: {Color.BOLD}{survived}{Color.RESET}")
    print(f"  Feinde besiegt:  {Color.BOLD}{total_kills}{Color.RESET}")
    print(f"  Gold gesammelt:  {Color.YELLOW}{gold}{Color.RESET}")
    print(f"  Türme gebaut:    {Color.BOLD}{len(towers)}{Color.RESET}")

    if wave >= 15:
        print(f"\n  {Color.YELLOW}{Color.BOLD}Legendärer Verteidiger!{Color.RESET}")
    elif wave >= 10:
        print(f"\n  {Color.GREEN}Starke Verteidigung!{Color.RESET}")
    elif wave >= 5:
        print(f"\n  {Color.CYAN}Guter Versuch!{Color.RESET}")

    print(f"{Color.muted('═' * 50)}")
    return wave, total_kills, gold


def tower_defense_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART TOWER DEFENSE':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('Verteidige deine Basis gegen Feindwellen!')}")
    print("  Baue Türme und besiege Feinde mit Dartwürfen.\n")

    print("    1) Spiel starten")
    print("    2) Zurück")

    choice = input("  Wahl (1-2): ").strip()
    if choice == "1":
        run_tower_defense()
        input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
