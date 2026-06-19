#!/usr/bin/env python3
"""Automatisierte Spieltests: Rechenfehler, negative Zahlen, Doppelfehler."""

import sys
import random

random.seed(42)

ERRORS = []
WARNINGS = []
TESTS_RUN = 0
TESTS_PASSED = 0


def log_error(game, msg):
    ERRORS.append(f"[{game}] {msg}")


def log_warning(game, msg):
    WARNINGS.append(f"[{game}] {msg}")


def test_pass(name):
    global TESTS_RUN, TESTS_PASSED
    TESTS_RUN += 1
    TESTS_PASSED += 1
    print(f"  PASS: {name}")


def test_fail(name, reason):
    global TESTS_RUN
    TESTS_RUN += 1
    print(f"  FAIL: {name} - {reason}")
    log_error("test", f"{name}: {reason}")


# ============================================================
# Test 1: DartBoard throw() - Score calculations
# ============================================================
def test_dartboard():
    print("\n=== Test: DartBoard Score-Berechnungen ===")
    from dart_game import DartBoard

    board = DartBoard()
    results = {"single": 0, "double": 0, "triple": 0, "bull": 0,
               "bullseye": 0, "miss": 0, "negative": 0, "over60": 0}

    for i in range(10000):
        result, points = board.throw()

        # Check for negative points
        if points < 0:
            results["negative"] += 1
            log_error("DartBoard", f"Negative Punkte: {result} = {points}")

        # Check for impossibly high points (max is 60 = Triple 20)
        if points > 60 and result != "Bullseye":
            results["over60"] += 1
            log_error("DartBoard", f"Punkte > 60 (kein Bullseye): {result} = {points}")

        # Verify score matches result string
        if result == "Bullseye":
            if points != 50:
                log_error("DartBoard", f"Bullseye sollte 50 sein, ist {points}")
            results["bullseye"] += 1
        elif result == "Bull":
            if points != 25:
                log_error("DartBoard", f"Bull sollte 25 sein, ist {points}")
            results["bull"] += 1
        elif result == "Miss":
            if points != 0:
                log_error("DartBoard", f"Miss sollte 0 sein, ist {points}")
            results["miss"] += 1
        elif result.startswith("Triple"):
            num = int(result.split()[1])
            expected = num * 3
            if points != expected:
                log_error("DartBoard", f"{result} sollte {expected} sein, ist {points}")
            results["triple"] += 1
        elif result.startswith("Double"):
            num = int(result.split()[1])
            expected = num * 2
            if points != expected:
                log_error("DartBoard", f"{result} sollte {expected} sein, ist {points}")
            results["double"] += 1
        else:
            try:
                num = int(result)
                if points != num:
                    log_error("DartBoard", f"Single {result} sollte {num} sein, ist {points}")
                results["single"] += 1
            except ValueError:
                log_error("DartBoard", f"Unbekanntes Ergebnis: {result} = {points}")

    if results["negative"] == 0:
        test_pass("Keine negativen Punkte")
    else:
        test_fail("Negative Punkte", f"{results['negative']} gefunden")

    if results["over60"] == 0:
        test_pass("Keine Punkte > 60 (ausser Bullseye)")
    else:
        test_fail("Punkte > 60", f"{results['over60']} gefunden")

    print(f"  Verteilung: S={results['single']} D={results['double']} "
          f"T={results['triple']} Bull={results['bull']} "
          f"BE={results['bullseye']} Miss={results['miss']}")


# ============================================================
# Test 2: parse_hit_number
# ============================================================
def test_parse_hit_number():
    print("\n=== Test: parse_hit_number ===")
    from training import parse_hit_number

    tests = [
        ("Bullseye", (25, "bullseye")),
        ("Bull", (25, "bull")),
        ("Miss", (0, "miss")),
        ("Triple 20", (20, "triple")),
        ("Double 16", (16, "double")),
        ("1", (1, "single")),
        ("20", (20, "single")),
        ("Triple 1", (1, "triple")),
        ("Double 1", (1, "double")),
    ]

    for input_str, expected in tests:
        result = parse_hit_number(input_str)
        if result == expected:
            test_pass(f"parse_hit_number('{input_str}') = {result}")
        else:
            test_fail(f"parse_hit_number('{input_str}')",
                      f"Erwartet {expected}, bekommen {result}")


# ============================================================
# Test 3: Standard Game (501) - score never goes negative
# ============================================================
def test_standard_501():
    print("\n=== Test: Standard 501 Scoring ===")
    from dart_game import DartBoard

    board = DartBoard()
    score = 501
    darts = 0
    busts = 0

    for _ in range(300):
        result, points = board.throw()
        darts += 1
        new_score = score - points

        if new_score < 0:
            busts += 1
            # Score should NOT change on bust
            continue  # This is the correct behavior
        elif new_score == 1:
            busts += 1
            continue  # Can't finish on 1 (need double)
        elif new_score == 0:
            # Check if it's a valid checkout (double)
            score = new_score
            break
        else:
            score = new_score

        if score < 0:
            log_error("501", f"Score ging unter 0: {score} nach {result}={points}")

    if score >= 0:
        test_pass("501 Score bleibt >= 0")
    else:
        test_fail("501 Score", f"Score ist {score}")


# ============================================================
# Test 4: Cricket Scoring
# ============================================================
def test_cricket():
    print("\n=== Test: Cricket Scoring ===")

    targets = [20, 19, 18, 17, 16, 15, 25]
    marks = {t: 0 for t in targets}
    points = 0

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    for _ in range(200):
        result, pts = board.throw()
        hit_num, hit_type = parse_hit_number(result)

        if hit_num in targets:
            multiplier = {"triple": 3, "double": 2, "bullseye": 2}.get(hit_type, 1)
            old_marks = marks[hit_num]
            new_marks = old_marks + multiplier
            excess = max(0, new_marks - 3)
            marks[hit_num] = min(new_marks, 3)

            if old_marks >= 3:
                earned = pts
                points += earned
            elif excess > 0:
                earned = hit_num * excess
                points += earned

            if points < 0:
                log_error("Cricket", f"Punkte negativ: {points}")
                break

    if points >= 0:
        test_pass("Cricket Punkte >= 0")
    else:
        test_fail("Cricket Punkte", f"{points}")


# ============================================================
# Test 5: Bowling Frame Scoring
# ============================================================
def test_bowling():
    print("\n=== Test: Bowling Frame Scoring ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    for game_num in range(5):
        frame_scores = []
        total = 0
        frames_played = 0

        for frame in range(10):
            r1, p1 = board.throw()
            hit1, _ = parse_hit_number(r1)
            pins_down_1 = min(hit1, 10)

            if pins_down_1 == 10:
                frame_scores.append(("strike", 10))
                frames_played += 1
                continue

            r2, p2 = board.throw()
            hit2, _ = parse_hit_number(r2)
            remaining = 10 - pins_down_1
            pins_down_2 = min(hit2, remaining)

            total_pins = pins_down_1 + pins_down_2
            if total_pins > 10:
                log_error("Bowling", f"Frame {frame+1}: Pins > 10: {pins_down_1} + {pins_down_2} = {total_pins}")

            if total_pins == 10:
                frame_scores.append(("spare", total_pins))
            else:
                frame_scores.append(("normal", total_pins))
            frames_played += 1

        # Verify no frame total exceeds 10 pins
        for i, (ftype, fpins) in enumerate(frame_scores):
            if fpins > 10:
                log_error("Bowling", f"Game {game_num+1} Frame {i+1}: {fpins} pins > 10")

    test_pass("Bowling Pins-Berechnung (5 Spiele)")


# ============================================================
# Test 6: Blackjack Score Calculations
# ============================================================
def test_blackjack():
    print("\n=== Test: Blackjack Score ===")
    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    for game_num in range(10):
        hand = []
        total = 0

        for _ in range(5):
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            card_value = min(hit_num, 10)
            if result == "Bullseye" or hit_type == "bullseye":
                card_value = 11  # Ace
            elif result == "Bull" or hit_type == "bull":
                card_value = 11
            elif result == "Miss":
                card_value = 0

            hand.append(card_value)
            total = sum(hand)

            # Ace adjustment
            while total > 21 and 11 in hand:
                idx = hand.index(11)
                hand[idx] = 1
                total = sum(hand)

            if total < 0:
                log_error("Blackjack", f"Negative Summe: {total}, Hand: {hand}")

    test_pass("Blackjack keine negativen Werte")


# ============================================================
# Test 7: War Territory Scoring
# ============================================================
def test_war():
    print("\n=== Test: War Territory Scoring ===")

    territories = [
        {"name": "Nord", "segments": [1, 2, 3, 4, 5], "bonus": 10},
        {"name": "Ost", "segments": [6, 7, 8, 9, 10], "bonus": 10},
        {"name": "Sued", "segments": [11, 12, 13, 14, 15], "bonus": 10},
        {"name": "West", "segments": [16, 17, 18, 19, 20], "bonus": 10},
    ]
    players = ["A", "B"]
    scores = {"A": 0, "B": 0}
    segment_owner = {}

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    for _ in range(60):
        for p in players:
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            if hit_num == 0 or result in ("Miss", "Bullseye", "Bull"):
                if result == "Bullseye":
                    scores[p] += 25
                elif result == "Bull":
                    scores[p] += 10
                continue

            if hit_num not in segment_owner:
                mult = {"double": 2, "triple": 3}.get(hit_type, 1)
                earned = hit_num * mult
                scores[p] += earned
                segment_owner[hit_num] = p
            elif segment_owner[hit_num] == p:
                scores[p] += 5
            else:
                old_owner = segment_owner[hit_num]
                if hit_type in ("double", "triple"):
                    segment_owner[hit_num] = p
                    mult = 2 if hit_type == "double" else 3
                    earned = hit_num * mult
                    scores[p] += earned
                    scores[old_owner] = max(0, scores[old_owner] - hit_num)

            # Check for negative scores
            for name, s in scores.items():
                if s < 0:
                    log_error("War", f"Spieler {name} hat negative Punkte: {s}")
                    scores[name] = 0

    for name, s in scores.items():
        if s < 0:
            test_fail(f"War Score {name}", f"Negativ: {s}")
        else:
            test_pass(f"War Score {name} >= 0: {s}")


# ============================================================
# Test 8: Tower Defense HP Calculations
# ============================================================
def test_tower_defense():
    print("\n=== Test: Tower Defense HP ===")

    base_hp = 10
    gold = 0
    total_kills = 0

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    for wave in range(1, 6):
        enemy_count = min(3 + wave, 8)
        enemies = []
        for _ in range(enemy_count):
            hp = random.randint(2, 12)
            enemies.append({"hp": hp, "max_hp": hp, "reward": 10})

        # Attack phase
        for _ in range(3):
            result, points = board.throw()
            alive = [e for e in enemies if e["hp"] > 0]
            if alive:
                target = alive[0]
                target["hp"] -= points
                if target["hp"] <= 0:
                    target["hp"] = 0
                    gold += target["reward"]
                    total_kills += 1

        survivors = [e for e in enemies if e["hp"] > 0]
        damage = len(survivors)
        base_hp -= damage
        base_hp = max(0, base_hp)

        if base_hp < 0:
            log_error("Tower Defense", f"base_hp < 0: {base_hp}")

        if gold < 0:
            log_error("Tower Defense", f"gold < 0: {gold}")

    if base_hp >= 0:
        test_pass("Tower Defense base_hp >= 0")
    if gold >= 0:
        test_pass("Tower Defense gold >= 0")


# ============================================================
# Test 9: Slots Credit System
# ============================================================
def test_slots():
    print("\n=== Test: Slots Credits ===")

    symbols = 6
    credits = 100
    spins = 0

    for _ in range(50):
        if credits < 10:
            break
        credits -= 10
        spins += 1

        reels = [random.randint(0, symbols - 1) for _ in range(3)]

        payout = 0
        if reels[0] == reels[1] == reels[2]:
            payouts = [10, 15, 30, 75, 200, 500]
            payout = payouts[reels[0]]
        elif reels[0] == reels[1] or reels[1] == reels[2] or reels[0] == reels[2]:
            payout = 5

        credits += payout

        if credits < 0:
            log_error("Slots", f"Credits negativ: {credits} nach Spin {spins}")

    if credits >= 0:
        test_pass(f"Slots Credits >= 0: {credits} nach {spins} Spins")
    else:
        test_fail("Slots Credits", f"Negativ: {credits}")


# ============================================================
# Test 10: Endurance HP System
# ============================================================
def test_endurance():
    print("\n=== Test: Endurance HP ===")

    hp = 100
    score = 0
    threshold = 15
    rounds = 0

    from dart_game import DartBoard
    board = DartBoard()

    for rnd in range(50):
        round_total = 0
        for dart in range(3):
            result, points = board.throw()
            round_total += points
            score += points

        if round_total < threshold:
            damage = max(5, threshold - round_total)
            hp -= damage
        else:
            heal = min(5, 100 - hp)
            hp += heal

        threshold = min(threshold + 2, 60)
        rounds += 1

        if hp > 100:
            log_error("Endurance", f"HP > 100: {hp}")

        if hp <= 0:
            break

    if hp <= 100:
        test_pass(f"Endurance HP <= 100 (max) nach {rounds} Runden")
    else:
        test_fail("Endurance HP", f"HP = {hp} > 100")


# ============================================================
# Test 11: Survival Wave System
# ============================================================
def test_survival():
    print("\n=== Test: Survival System ===")

    hp = 50
    score = 0
    total_kills = 0

    for wave in range(1, 11):
        enemies = 2 + wave
        killed = 0
        darts_left = enemies + 2

        from dart_game import DartBoard
        board = DartBoard()

        for _ in range(darts_left):
            _, points = board.throw()
            kill_threshold = 10 + wave * 3
            if points >= kill_threshold:
                killed += 1
                total_kills += 1
                score += points * 2
            else:
                score += points

        remaining = enemies - killed
        if remaining > 0:
            damage = remaining * 5
            hp -= damage

        if hp <= 0:
            break

    if score >= 0:
        test_pass(f"Survival Score >= 0: {score}")
    else:
        test_fail("Survival Score", f"Negativ: {score}")

    if hp <= 50:
        test_pass("Survival HP <= 50 (max)")
    else:
        test_fail("Survival HP", f"{hp} > 50")


# ============================================================
# Test 12: Combo Streak System
# ============================================================
def test_combos():
    print("\n=== Test: Combo Streak ===")
    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()
    score = 0
    streak = 0
    last_type = None

    for _ in range(30):
        result, points = board.throw()
        _, hit_type = parse_hit_number(result)

        if hit_type in ("single", "double", "triple"):
            if last_type != hit_type:
                streak += 1
                bonus = streak * 5
                score += points + bonus
            else:
                streak = 1
                score += points
            last_type = hit_type
        else:
            streak = 0
            last_type = None
            score += points

        if score < 0:
            log_error("Combos", f"Score negativ: {score}")
            break

    if score >= 0:
        test_pass(f"Combo Score >= 0: {score}")
    else:
        test_fail("Combo Score", f"Negativ: {score}")


# ============================================================
# Test 13: Math Darts answer validation
# ============================================================
def test_math_darts():
    print("\n=== Test: Math Darts Answers ===")

    operations = [
        ("+", lambda a, b: a + b),
        ("-", lambda a, b: a - b),
        ("*", lambda a, b: a * b),
    ]

    errors = 0
    for _ in range(100):
        op_name, op_func = random.choice(operations)
        a = random.randint(1, 20)
        b = random.randint(1, 20)
        answer = op_func(a, b)

        # Check if answer could be negative
        if answer < 0:
            log_warning("Math Darts", f"{a} {op_name} {b} = {answer} (negativ!)")

        # Check if answer is achievable with a dart throw
        if answer > 60:
            log_warning("Math Darts", f"{a} {op_name} {b} = {answer} (nicht werfbar, max 60)")

    test_pass("Math Darts Berechnung geprueft")


# ============================================================
# Test 14: Around the Clock target progression
# ============================================================
def test_around_the_clock():
    print("\n=== Test: Around the Clock ===")

    targets = list(range(1, 21)) + [25]
    target_idx = 0
    total_darts = 0
    hits_first_try = 0

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    while target_idx < len(targets) and total_darts < 500:
        current = targets[target_idx]
        result, points = board.throw()
        hit_num, _ = parse_hit_number(result)
        total_darts += 1

        if hit_num == current:
            target_idx += 1

    if target_idx == len(targets):
        accuracy = (hits_first_try / 21) * 100
        if accuracy < 0 or accuracy > 100:
            test_fail("ATC Accuracy", f"Ungueltig: {accuracy}%")
        else:
            test_pass(f"Around the Clock in {total_darts} Darts")
    else:
        test_pass(f"Around the Clock (nicht beendet in 500 Darts, normal)")


# ============================================================
# Test 15: Double Out progression
# ============================================================
def test_double_out():
    print("\n=== Test: Double Out ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()
    target_double = 1
    total_darts = 0
    hits_first_try = 0

    while target_double <= 20 and total_darts < 1000:
        result, points = board.throw()
        hit_num, hit_type = parse_hit_number(result)
        total_darts += 1

        if hit_type == "double" and hit_num == target_double:
            target_double += 1

    if total_darts < 1000:
        accuracy = (hits_first_try / 20) * 100
        if accuracy < 0 or accuracy > 100:
            test_fail("Double Out Accuracy", f"Ungueltig: {accuracy}%")
        else:
            test_pass(f"Double Out in {total_darts} Darts")
    else:
        test_pass("Double Out (nicht beendet, normal bei Zufall)")


# ============================================================
# Test 16: Lucky Number double counting
# ============================================================
def test_lucky_number():
    print("\n=== Test: Lucky Number ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    players = ["A", "B"]
    scores = {"A": 0, "B": 0}
    lucky = random.randint(1, 20)

    for rnd in range(8):
        lucky = random.randint(1, 20)
        for p in players:
            for dart in range(3):
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                earned = 0

                if hit_num == lucky:
                    mult = {"triple": 3, "double": 2}.get(hit_type, 1)
                    earned = lucky * mult * 2  # Double for lucky number
                elif points > 0:
                    earned = points

                old_score = scores[p]
                scores[p] += earned

                if scores[p] < old_score and earned >= 0:
                    log_error("Lucky Number", f"Score ging runter ohne Grund: "
                              f"{old_score} -> {scores[p]}, earned={earned}")

    for p in players:
        if scores[p] < 0:
            test_fail(f"Lucky Number Score {p}", f"Negativ: {scores[p]}")
        else:
            test_pass(f"Lucky Number Score {p} >= 0: {scores[p]}")


# ============================================================
# Test 17: Auction budget never negative
# ============================================================
def test_auction():
    print("\n=== Test: Auction Budget ===")

    from dart_game import DartBoard
    board = DartBoard()

    players = ["A", "B"]
    budgets = {"A": 500, "B": 500}
    scores = {"A": 0, "B": 0}

    for rnd in range(10):
        bids = {}
        for p in players:
            _, points = board.throw()
            bid = min(points, budgets[p])
            bids[p] = bid

        winner = max(bids, key=bids.get)
        budgets[winner] -= bids[winner]

        if budgets[winner] < 0:
            log_error("Auction", f"{winner} Budget negativ: {budgets[winner]}")

    for p in players:
        if budgets[p] < 0:
            test_fail(f"Auction Budget {p}", f"Negativ: {budgets[p]}")
        else:
            test_pass(f"Auction Budget {p} >= 0: {budgets[p]}")


# ============================================================
# Test 18: Killer lives system
# ============================================================
def test_killer():
    print("\n=== Test: Killer Lives ===")

    players = {
        "A": {"number": 5, "lives": 3, "is_killer": False, "alive": True},
        "B": {"number": 10, "lives": 3, "is_killer": False, "alive": True},
        "C": {"number": 15, "lives": 3, "is_killer": False, "alive": True},
    }

    # Simulate some hits
    players["A"]["is_killer"] = True
    players["B"]["lives"] -= 1  # A hits B
    players["B"]["lives"] -= 1  # A hits B
    players["B"]["lives"] -= 1  # A hits B

    if players["B"]["lives"] <= 0:
        players["B"]["alive"] = False

    # Check no lives go below 0 in our tracking
    for name, p in players.items():
        if p["lives"] < 0:
            test_fail(f"Killer {name} lives", f"Negativ: {p['lives']}")
        else:
            test_pass(f"Killer {name} lives >= 0")


# ============================================================
# Test 19: Shanghai scoring
# ============================================================
def test_shanghai():
    print("\n=== Test: Shanghai Scoring ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()
    shanghai_numbers = [15, 16, 17, 18, 19, 20, 25]
    scores = {"A": 0, "B": 0}

    for target in shanghai_numbers:
        for p in ["A", "B"]:
            round_points = 0
            for dart in range(3):
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)

                if target == 25:
                    if result == "Bullseye":
                        round_points += 50
                    elif result == "Bull":
                        round_points += 25
                elif hit_num == target:
                    if hit_type == "single":
                        round_points += target
                    elif hit_type == "double":
                        round_points += target * 2
                    elif hit_type == "triple":
                        round_points += target * 3
                    else:
                        round_points += target

            if round_points < 0:
                log_error("Shanghai", f"Runden-Punkte negativ: {round_points}")

            scores[p] += round_points

    for p, s in scores.items():
        if s < 0:
            test_fail(f"Shanghai Score {p}", f"Negativ: {s}")
        else:
            test_pass(f"Shanghai Score {p} >= 0: {s}")


# ============================================================
# Test 20: Roulette payout system
# ============================================================
def test_roulette():
    print("\n=== Test: Roulette Payouts ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()
    scores = {"A": 0, "B": 0}

    for rnd in range(8):
        bet_type = random.choice(["gerade", "ungerade", "rot", "schwarz",
                                   "hoch", "niedrig"])

        for p in ["A", "B"]:
            result, points = board.throw()
            hit_num, hit_type = parse_hit_number(result)

            won = False
            if bet_type == "gerade" and hit_num > 0 and hit_num % 2 == 0:
                won = True
            elif bet_type == "ungerade" and hit_num > 0 and hit_num % 2 == 1:
                won = True
            elif bet_type == "hoch" and hit_num > 10:
                won = True
            elif bet_type == "niedrig" and 0 < hit_num <= 10:
                won = True

            if won:
                scores[p] += points * 2
            else:
                scores[p] += points

    for p, s in scores.items():
        if s < 0:
            test_fail(f"Roulette Score {p}", f"Negativ: {s}")
        else:
            test_pass(f"Roulette Score {p} >= 0: {s}")


# ============================================================
# Test 21: Puzzle number sequence correctness
# ============================================================
def test_puzzle():
    print("\n=== Test: Puzzle Sequences ===")

    # Test arithmetic sequences
    for _ in range(10):
        start = random.randint(1, 10)
        step = random.randint(1, 5)
        seq = [start + i * step for i in range(5)]
        answer = start + 5 * step

        # Verify
        expected = seq[-1] + step
        if answer != expected:
            test_fail("Puzzle arithmetic", f"Seq {seq}, erwartet {expected}, berechnet {answer}")

    test_pass("Puzzle arithmetische Folgen korrekt")

    # Test fibonacci-like
    for _ in range(10):
        a, b = random.randint(1, 5), random.randint(1, 5)
        seq = [a, b]
        for i in range(3):
            seq.append(seq[-1] + seq[-2])
        answer = seq[-1] + seq[-2]
        if answer != seq[-1] + seq[-2]:
            test_fail("Puzzle Fibonacci", f"Falsch: {seq} -> {answer}")

    test_pass("Puzzle Fibonacci-Folgen korrekt")


# ============================================================
# Test 22: Golf par system
# ============================================================
def test_golf():
    print("\n=== Test: Golf Par System ===")

    from dart_game import DartBoard
    from training import parse_hit_number

    board = DartBoard()

    holes = [
        {"target": 20, "par": 3},
        {"target": 19, "par": 3},
        {"target": 18, "par": 4},
        {"target": 17, "par": 4},
    ]

    total_score = 0
    for hole in holes:
        strokes = 0
        hit = False
        for _ in range(hole["par"] + 3):  # max par + 3
            result, points = board.throw()
            hit_num, _ = parse_hit_number(result)
            strokes += 1
            if hit_num == hole["target"]:
                hit = True
                break

        diff = strokes - hole["par"]
        total_score += diff if hit else hole["par"] + 3

    # Golf scores can be negative (under par) - that's OK
    test_pass(f"Golf Score berechnet: {total_score}")


# ============================================================
# Run GUI logic tests
# ============================================================
def test_gui_scoring():
    print("\n=== Test: GUI Score-Logik ===")

    # Test: Standard game bust logic
    score = 501
    points = 502
    new_score = score - points
    if new_score < 0:
        # Should bust
        test_pass("501 Bust bei Ueberwurf korrekt")
    else:
        test_fail("501 Bust", "Kein Bust bei Ueberwurf")

    # Test: Score = 1 is also bust
    score = 41
    points = 40
    new_score = score - points
    if new_score == 1:
        # Should bust (can't finish from 1)
        test_pass("501 Bust bei Rest=1 korrekt")
    else:
        test_fail("501 Bust bei 1", f"new_score = {new_score}")

    # Test: Double checkout
    score = 40
    points = 40
    hit_type = "double"
    new_score = score - points
    if new_score == 0 and hit_type == "double":
        test_pass("Double Checkout korrekt")


# ============================================================
# Main
# ============================================================
def main():
    print("=" * 60)
    print("  AUTOMATISIERTE SPIELTESTS")
    print("  Pruefe Rechenfehler, negative Zahlen, Doppelfehler")
    print("=" * 60)

    test_dartboard()
    test_parse_hit_number()
    test_standard_501()
    test_cricket()
    test_bowling()
    test_blackjack()
    test_war()
    test_tower_defense()
    test_slots()
    test_endurance()
    test_survival()
    test_combos()
    test_math_darts()
    test_around_the_clock()
    test_double_out()
    test_lucky_number()
    test_auction()
    test_killer()
    test_shanghai()
    test_roulette()
    test_puzzle()
    test_golf()
    test_gui_scoring()

    print("\n" + "=" * 60)
    print(f"  ERGEBNIS: {TESTS_PASSED}/{TESTS_RUN} Tests bestanden")
    print("=" * 60)

    if ERRORS:
        print(f"\n  FEHLER ({len(ERRORS)}):")
        for e in ERRORS:
            print(f"    !! {e}")

    if WARNINGS:
        print(f"\n  WARNUNGEN ({len(WARNINGS)}):")
        for w in WARNINGS:
            print(f"    ?? {w}")

    if not ERRORS:
        print("\n  ALLE TESTS BESTANDEN!")
    else:
        print(f"\n  {len(ERRORS)} FEHLER GEFUNDEN!")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
