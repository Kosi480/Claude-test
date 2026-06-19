#!/usr/bin/env python3
"""Tägliche Herausforderungen für das Dart-Spiel."""

import json
import os
import random
import time
from datetime import datetime, date
from dart_game import DartBoard, Color, throw_animation
from training import parse_hit_number

DAILY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daily_progress.json")

CHALLENGE_TEMPLATES = [
    {
        "id": "bullseye_hunt",
        "name": "Bullseye-Jagd",
        "desc": "Triff {target} Bullseyes in {max_darts} Darts",
        "target_range": (2, 5),
        "max_darts_range": (20, 40),
        "xp_reward": 75,
    },
    {
        "id": "triple_spree",
        "name": "Triple-Serie",
        "desc": "Triff {target} Triples in {max_darts} Darts",
        "target_range": (4, 8),
        "max_darts_range": (20, 35),
        "xp_reward": 60,
    },
    {
        "id": "century_maker",
        "name": "Century Maker",
        "desc": "Erziele {target} Runden mit 100+ Punkten in {max_rounds} Runden",
        "target_range": (2, 4),
        "max_rounds_range": (6, 10),
        "xp_reward": 80,
    },
    {
        "id": "no_miss",
        "name": "Kein Fehlwurf",
        "desc": "Wirf {max_darts} Darts ohne Miss",
        "max_darts_range": (8, 15),
        "xp_reward": 90,
    },
    {
        "id": "double_streak",
        "name": "Double-Fieber",
        "desc": "Triff {target} Doubles in {max_darts} Darts",
        "target_range": (3, 6),
        "max_darts_range": (15, 30),
        "xp_reward": 65,
    },
    {
        "id": "score_attack",
        "name": "Punkte-Attacke",
        "desc": "Erziele {target}+ Punkte in {max_darts} Darts",
        "target_range": (300, 600),
        "max_darts_range": (15, 25),
        "xp_reward": 70,
    },
]


def generate_daily_challenge(day_seed=None):
    if day_seed is None:
        day_seed = date.today().toordinal()
    rng = random.Random(day_seed)

    template = rng.choice(CHALLENGE_TEMPLATES)
    challenge = {
        "id": template["id"],
        "name": template["name"],
        "xp_reward": template["xp_reward"],
        "day": day_seed,
    }

    if "target_range" in template:
        challenge["target"] = rng.randint(*template["target_range"])
    if "max_darts_range" in template:
        challenge["max_darts"] = rng.randint(*template["max_darts_range"])
    if "max_rounds_range" in template:
        challenge["max_rounds"] = rng.randint(*template["max_rounds_range"])

    challenge["desc"] = template["desc"].format(**{
        k: v for k, v in challenge.items() if k not in ("id", "name", "xp_reward", "day", "desc")
    })

    return challenge


def load_daily_progress():
    if os.path.exists(DAILY_FILE):
        with open(DAILY_FILE, "r") as f:
            return json.load(f)
    return {}


def save_daily_progress(progress):
    with open(DAILY_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def is_completed_today(player_name):
    progress = load_daily_progress()
    today = str(date.today().toordinal())
    return progress.get(player_name, {}).get("last_day") == today


def mark_completed(player_name, challenge, succeeded):
    progress = load_daily_progress()
    today = str(date.today().toordinal())
    if player_name not in progress:
        progress[player_name] = {"streak": 0, "total_completed": 0, "last_day": ""}

    p = progress[player_name]
    yesterday = str(date.today().toordinal() - 1)
    if succeeded:
        if p["last_day"] == yesterday:
            p["streak"] += 1
        elif p["last_day"] != today:
            p["streak"] = 1
        p["total_completed"] += 1
    else:
        if p["last_day"] != yesterday and p["last_day"] != today:
            p["streak"] = 0

    p["last_day"] = today
    progress[player_name] = p
    save_daily_progress(progress)
    return p


def play_daily_challenge(player_name):
    challenge = generate_daily_challenge()

    print(Color.muted("=" * 50))
    print(Color.title(f"{'TÄGLICHE HERAUSFORDERUNG':^50}"))
    print(Color.muted("=" * 50))
    print(f"\n  {Color.BOLD}{Color.YELLOW}{challenge['name']}{Color.RESET}")
    print(f"  {challenge['desc']}")
    xp = challenge["xp_reward"]
    print(f"  Belohnung: {Color.success(f'+{xp} XP')}")

    if is_completed_today(player_name):
        print(Color.muted("\n  Du hast die heutige Challenge bereits abgeschlossen!"))
        input("\n  [Enter] zum Fortfahren...")
        return

    progress = load_daily_progress()
    streak = progress.get(player_name, {}).get("streak", 0)
    if streak > 0:
        print(f"  Serie: {Color.BOLD}{Color.YELLOW}{'🔥' * min(streak, 7)} {streak} Tage{Color.RESET}")

    input(Color.info("\n  [Enter] zum Starten..."))

    board = DartBoard()
    cid = challenge["id"]
    succeeded = False

    if cid == "bullseye_hunt":
        succeeded = _challenge_bullseye_hunt(board, challenge)
    elif cid == "triple_spree":
        succeeded = _challenge_triple_spree(board, challenge)
    elif cid == "century_maker":
        succeeded = _challenge_century_maker(board, challenge)
    elif cid == "no_miss":
        succeeded = _challenge_no_miss(board, challenge)
    elif cid == "double_streak":
        succeeded = _challenge_double_streak(board, challenge)
    elif cid == "score_attack":
        succeeded = _challenge_score_attack(board, challenge)

    p = mark_completed(player_name, challenge, succeeded)

    if succeeded:
        print(f"\n{Color.BOLD}{Color.YELLOW}{'*' * 44}")
        print(f"  CHALLENGE GESCHAFFT!")
        print(f"  +{challenge['xp_reward']} XP verdient!")
        if p["streak"] > 1:
            print(f"  Serie: {p['streak']} Tage in Folge!")
        print(f"{'*' * 44}{Color.RESET}")

        try:
            from profiles import ProfileManager
            profile, xp, leveled, _ = ProfileManager.update_after_game(
                player_name,
                type("S", (), {"bullseyes": 0, "triples": 0, "round_scores": [], "highest_round": 0})(),
                won=False,
            )
            profile.add_xp(challenge["xp_reward"])
            profiles = ProfileManager.load_all()
            profiles[player_name] = profile
            ProfileManager.save_all(profiles)
        except ImportError:
            pass
    else:
        print(f"\n{Color.warning('  Challenge nicht bestanden.')}")
        print(Color.muted("  Morgen gibt's eine neue Chance!"))


def _challenge_bullseye_hunt(board, ch):
    target = ch["target"]
    max_darts = ch["max_darts"]
    hits = 0
    for d in range(1, max_darts + 1):
        print(f"\n  Dart {d}/{max_darts} | Bullseyes: {Color.BOLD}{hits}/{target}{Color.RESET}")
        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        print(f"    -> {Color.colorize_result(result, points)}")
        if result == "Bullseye":
            hits += 1
            print(Color.success(f"    BULLSEYE! ({hits}/{target})"))
        if hits >= target:
            return True
    return False


def _challenge_triple_spree(board, ch):
    target = ch["target"]
    max_darts = ch["max_darts"]
    hits = 0
    for d in range(1, max_darts + 1):
        print(f"\n  Dart {d}/{max_darts} | Triples: {Color.BOLD}{hits}/{target}{Color.RESET}")
        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        print(f"    -> {Color.colorize_result(result, points)}")
        if result.startswith("Triple"):
            hits += 1
            print(Color.success(f"    TRIPLE! ({hits}/{target})"))
        if hits >= target:
            return True
    return False


def _challenge_century_maker(board, ch):
    target = ch["target"]
    max_rounds = ch["max_rounds"]
    centuries = 0
    for r in range(1, max_rounds + 1):
        print(f"\n  {Color.BOLD}Runde {r}/{max_rounds}{Color.RESET} | 100er: {centuries}/{target}")
        round_score = 0
        for d in range(1, 4):
            input(f"  Dart {d}/3 - [Enter]...")
            throw_animation()
            result, points = board.throw()
            round_score += points
            print(f"    -> {Color.colorize_result(result, points)} | Summe: {round_score}")
        if round_score >= 100:
            centuries += 1
            print(Color.success(f"    CENTURY! {round_score} Punkte ({centuries}/{target})"))
        if centuries >= target:
            return True
    return False


def _challenge_no_miss(board, ch):
    max_darts = ch["max_darts"]
    for d in range(1, max_darts + 1):
        print(f"\n  Dart {d}/{max_darts}")
        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        print(f"    -> {Color.colorize_result(result, points)}")
        if result == "Miss":
            print(Color.warning("    MISS! Challenge fehlgeschlagen."))
            return False
        print(Color.success("    Kein Miss!"))
    return True


def _challenge_double_streak(board, ch):
    target = ch["target"]
    max_darts = ch["max_darts"]
    hits = 0
    for d in range(1, max_darts + 1):
        print(f"\n  Dart {d}/{max_darts} | Doubles: {Color.BOLD}{hits}/{target}{Color.RESET}")
        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        print(f"    -> {Color.colorize_result(result, points)}")
        if result.startswith("Double"):
            hits += 1
            print(Color.success(f"    DOUBLE! ({hits}/{target})"))
        if hits >= target:
            return True
    return False


def _challenge_score_attack(board, ch):
    target = ch["target"]
    max_darts = ch["max_darts"]
    total = 0
    for d in range(1, max_darts + 1):
        print(f"\n  Dart {d}/{max_darts} | Punkte: {Color.BOLD}{total}/{target}{Color.RESET}")
        input("  [Enter] zum Werfen...")
        throw_animation()
        result, points = board.throw()
        total += points
        print(f"    -> {Color.colorize_result(result, points)} | Gesamt: {total}")
        if total >= target:
            return True
    return False


def daily_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'TÄGLICHE CHALLENGE':^50}"))
    print(Color.muted("=" * 50))

    name = input("\n  Dein Name: ").strip()
    if not name:
        name = "Spieler"

    play_daily_challenge(name)
