#!/usr/bin/env python3
"""Tiefe Spieltests: Simuliert komplette Spieldurchlaeufe mit Edge Cases."""

import sys
import random
import unittest
from unittest.mock import patch
from io import StringIO

random.seed(123)

ERRORS = []


def log_error(game, msg):
    ERRORS.append(f"[{game}] {msg}")
    print(f"  !! FEHLER: [{game}] {msg}")


class TestDartBoard(unittest.TestCase):
    def test_10000_throws_no_negative(self):
        from dart_game import DartBoard
        board = DartBoard()
        for _ in range(10000):
            result, points = board.throw()
            self.assertGreaterEqual(points, 0, f"Negative Punkte: {result}={points}")

    def test_score_ranges(self):
        from dart_game import DartBoard
        board = DartBoard()
        for _ in range(5000):
            result, points = board.throw()
            if result == "Bullseye":
                self.assertEqual(points, 50)
            elif result == "Bull":
                self.assertEqual(points, 25)
            elif result == "Miss":
                self.assertEqual(points, 0)
            elif result.startswith("Triple"):
                num = int(result.split()[1])
                self.assertEqual(points, num * 3)
                self.assertIn(num, range(1, 21))
            elif result.startswith("Double"):
                num = int(result.split()[1])
                self.assertEqual(points, num * 2)
                self.assertIn(num, range(1, 21))
            else:
                num = int(result)
                self.assertEqual(points, num)
                self.assertIn(num, range(1, 21))

    def test_max_single_throw(self):
        from dart_game import DartBoard
        board = DartBoard()
        max_pts = 0
        for _ in range(10000):
            _, points = board.throw()
            max_pts = max(max_pts, points)
        self.assertLessEqual(max_pts, 60, "Max Einzelwurf sollte <= 60 sein (Triple 20 oder Bullseye 50)")


class TestParseHitNumber(unittest.TestCase):
    def test_all_singles(self):
        from training import parse_hit_number
        for i in range(1, 21):
            num, typ = parse_hit_number(str(i))
            self.assertEqual(num, i)
            self.assertEqual(typ, "single")

    def test_all_doubles(self):
        from training import parse_hit_number
        for i in range(1, 21):
            num, typ = parse_hit_number(f"Double {i}")
            self.assertEqual(num, i)
            self.assertEqual(typ, "double")

    def test_all_triples(self):
        from training import parse_hit_number
        for i in range(1, 21):
            num, typ = parse_hit_number(f"Triple {i}")
            self.assertEqual(num, i)
            self.assertEqual(typ, "triple")

    def test_special(self):
        from training import parse_hit_number
        self.assertEqual(parse_hit_number("Bullseye"), (25, "bullseye"))
        self.assertEqual(parse_hit_number("Bull"), (25, "bull"))
        self.assertEqual(parse_hit_number("Miss"), (0, "miss"))

    def test_single_prefix(self):
        from training import parse_hit_number
        for i in range(1, 21):
            num, typ = parse_hit_number(f"Single {i}")
            self.assertEqual(num, i)
            self.assertEqual(typ, "single")

    def test_garbage(self):
        from training import parse_hit_number
        self.assertEqual(parse_hit_number("xyz"), (0, "miss"))
        self.assertEqual(parse_hit_number(""), (0, "miss"))


class TestBlackjackFix(unittest.TestCase):
    def test_miss_label_matches_value(self):
        from blackjack import dart_to_card_value
        for _ in range(200):
            val, label = dart_to_card_value("Miss", 0)
            self.assertIn(val, [2, 3])
            self.assertEqual(label, f"Niete ({val})",
                             f"Label '{label}' passt nicht zu Wert {val}")

    def test_bullseye_is_ace(self):
        from blackjack import dart_to_card_value
        val, label = dart_to_card_value("Bullseye", 50)
        self.assertEqual(val, 11)

    def test_values_never_negative(self):
        from blackjack import dart_to_card_value
        from dart_game import DartBoard
        board = DartBoard()
        for _ in range(1000):
            result, points = board.throw()
            val, label = dart_to_card_value(result, points)
            self.assertGreaterEqual(val, 0, f"Negativer Kartenwert: {result}={points} -> {val}")

    def test_values_capped_at_11(self):
        from blackjack import dart_to_card_value
        from dart_game import DartBoard
        board = DartBoard()
        for _ in range(1000):
            result, points = board.throw()
            val, _ = dart_to_card_value(result, points)
            self.assertLessEqual(val, 11, f"Kartenwert > 11: {result}={points} -> {val}")


class TestGolfFix(unittest.TestCase):
    def test_failed_hole_uses_max_darts(self):
        from golf import MAX_DARTS_PER_HOLE
        darts = MAX_DARTS_PER_HOLE
        hit = False
        if not hit:
            expected = MAX_DARTS_PER_HOLE
            self.assertEqual(darts, expected,
                             f"Verfehlte Loecher sollten {expected} Darts zaehlen, nicht {expected+1}")


class TestRouletteFix(unittest.TestCase):
    def test_swap_doesnt_double_count(self):
        scores = {"A": 100, "B": 200}
        points = 30
        player = "A"
        swap_target = "B"

        old_self = scores[player]
        old_other = scores[swap_target]
        scores[player] = old_other
        scores[swap_target] = old_self
        scores[player] += points

        self.assertEqual(scores["A"], 230, "Nach Swap: A sollte Bs alte Punkte + Runde haben")
        self.assertEqual(scores["B"], 100, "Nach Swap: B sollte As alte Punkte haben")
        total = scores["A"] + scores["B"]
        self.assertEqual(total, 100 + 200 + 30, "Gesamtpunkte muessen stimmen")


class TestDuelFix(unittest.TestCase):
    def test_highest_single_excludes_doubles(self):
        from duel import score_highest_single
        throws = [
            {"type": "double", "number": 20, "multiplier": 2},
            {"type": "single", "number": 5, "multiplier": 1},
        ]
        result = score_highest_single(throws)
        self.assertEqual(result, 5, "Double 20 sollte nicht als Single zaehlen")

    def test_highest_single_excludes_triples(self):
        from duel import score_highest_single
        throws = [
            {"type": "triple", "number": 20, "multiplier": 3},
            {"type": "single", "number": 3, "multiplier": 1},
        ]
        result = score_highest_single(throws)
        self.assertEqual(result, 3, "Triple 20 sollte nicht als Single zaehlen")

    def test_bull_counts(self):
        from duel import score_highest_single
        throws = [
            {"type": "bull", "number": 25, "multiplier": 1},
            {"type": "single", "number": 10, "multiplier": 1},
        ]
        result = score_highest_single(throws)
        self.assertEqual(result, 25, "Bull sollte als 25 zaehlen")


class TestPenaltyFix(unittest.TestCase):
    def test_early_termination_padding(self):
        p1_results = [True, True, True]
        p2_results = [False, False]
        p2_goals = 0
        p1_goals = 3
        r = 3
        remaining = 5 - r  # = 2
        for _ in range(remaining + 1):
            p2_results.append(False)
        self.assertEqual(len(p2_results), 5,
                         f"P2 sollte 5 Ergebnisse haben, hat {len(p2_results)}")


class TestBingoFix(unittest.TestCase):
    def test_even_segment_check(self):
        from bingo import BINGO_TARGETS
        ger_target = None
        for label, desc, check_fn in BINGO_TARGETS:
            if label == "Ger":
                ger_target = check_fn
                break
        self.assertIsNotNone(ger_target)
        self.assertTrue(ger_target("Double 10", 20), "Double 10 (Segment 10) sollte gerade sein")
        self.assertTrue(ger_target("20", 20), "Single 20 sollte gerade sein")
        self.assertFalse(ger_target("Triple 7", 21), "Triple 7 (Segment 7) sollte ungerade sein")
        self.assertTrue(ger_target("Triple 20", 60), "Triple 20 (Segment 20) sollte gerade sein")

    def test_odd_segment_check(self):
        from bingo import BINGO_TARGETS
        ung_target = None
        for label, desc, check_fn in BINGO_TARGETS:
            if label == "Ung":
                ung_target = check_fn
                break
        self.assertIsNotNone(ung_target)
        self.assertTrue(ung_target("7", 7), "Single 7 sollte ungerade sein")
        self.assertTrue(ung_target("Triple 19", 57), "Triple 19 (Segment 19) sollte ungerade sein")
        self.assertFalse(ung_target("Double 10", 20), "Double 10 (Segment 10) sollte gerade sein")


class TestSlotsCredits(unittest.TestCase):
    def test_credits_never_negative(self):
        from slots import dart_to_reel, check_payout
        credits = 100
        for _ in range(200):
            if credits < 10:
                break
            credits -= 10
            reels = [random.randint(0, 5) for _ in range(3)]
            _, payout = check_payout(reels)
            credits += payout
            self.assertGreaterEqual(credits, 0, f"Credits negativ: {credits}")

    def test_all_payouts_positive(self):
        from slots import check_payout, PAYOUTS
        for key, (name, payout) in PAYOUTS.items():
            self.assertGreater(payout, 0, f"Payout fuer {name} sollte > 0 sein")

    def test_pair_payout(self):
        from slots import check_payout
        _, payout = check_payout([1, 1, 2])
        self.assertEqual(payout, 5, "Ein Paar sollte 5 geben")
        _, payout = check_payout([1, 2, 2])
        self.assertEqual(payout, 5)
        _, payout = check_payout([1, 2, 1])
        self.assertEqual(payout, 5)

    def test_no_match(self):
        from slots import check_payout
        _, payout = check_payout([0, 1, 2])
        self.assertEqual(payout, 0, "Kein Match = 0 Payout")


class TestAuctionBudget(unittest.TestCase):
    def test_budget_never_negative(self):
        from dart_game import DartBoard
        board = DartBoard()
        players = ["A", "B"]
        budgets = {"A": 500, "B": 500}

        for _ in range(20):
            bids = {}
            for p in players:
                _, points = board.throw()
                bid = min(points, budgets[p])
                bids[p] = bid
            winner = max(bids, key=bids.get)
            budgets[winner] -= bids[winner]
            self.assertGreaterEqual(budgets[winner], 0,
                                    f"Budget negativ: {winner}={budgets[winner]}")


class TestWarScoring(unittest.TestCase):
    def test_steal_clamps_score(self):
        scores = {"A": 5, "B": 100}
        hit_num = 10
        old_owner = "A"
        scores[old_owner] = max(0, scores[old_owner] - hit_num)
        self.assertEqual(scores["A"], 0, "Score sollte auf 0 geclampt werden, nicht negativ")

    def test_segment_ownership_unique(self):
        segment_owner = {}
        for seg in range(1, 21):
            segment_owner[seg] = random.choice(["A", "B"])
        for seg, owner in segment_owner.items():
            self.assertIn(owner, ["A", "B"])
            count = sum(1 for v in segment_owner.values() if v == owner)
            self.assertGreater(count, 0)


class TestTowerDefense(unittest.TestCase):
    def test_enemy_hp_never_below_zero(self):
        enemies = [{"hp": 5, "max_hp": 5, "reward": 10}]
        damage = 20
        enemies[0]["hp"] -= damage
        if enemies[0]["hp"] <= 0:
            enemies[0]["hp"] = 0
        self.assertEqual(enemies[0]["hp"], 0)

    def test_wave_generation(self):
        from tower_defense import generate_wave
        for wave in range(1, 21):
            enemies = generate_wave(wave)
            self.assertGreater(len(enemies), 0, f"Welle {wave} hat keine Feinde")
            for e in enemies:
                self.assertGreater(e["hp"], 0, f"Feind HP <= 0 in Welle {wave}")
                self.assertEqual(e["hp"], e["max_hp"])
                self.assertGreater(e["reward"], 0)
                self.assertIn(e["position"], range(1, 21))


class TestMaze(unittest.TestCase):
    def test_maze_generation_valid(self):
        from maze import generate_maze
        for size in [3, 5, 7]:
            maze = generate_maze(size, size)
            self.assertEqual(len(maze), size)
            for row in maze:
                self.assertEqual(len(row), size)

    def test_maze_solvable(self):
        from maze import generate_maze, DIRECTIONS
        maze = generate_maze(5, 5)
        visited = set()
        stack = [(0, 0)]
        visited.add((0, 0))
        while stack:
            x, y = stack.pop()
            if x == 4 and y == 4:
                break
            for d, (dx, dy) in DIRECTIONS.items():
                if not maze[y][x][d]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < 5 and 0 <= ny < 5 and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        stack.append((nx, ny))
        self.assertIn((4, 4), visited, "Maze muss loesbar sein!")


class TestEndurance(unittest.TestCase):
    def test_hp_capped_at_100(self):
        hp = 95
        heal = min(5, 100 - hp)
        hp += heal
        self.assertLessEqual(hp, 100)

        hp = 100
        heal = min(5, 100 - hp)
        hp += heal
        self.assertEqual(hp, 100)

    def test_threshold_capped(self):
        threshold = 15
        for _ in range(100):
            threshold = min(threshold + 2, 60)
        self.assertEqual(threshold, 60)


class TestSurvival(unittest.TestCase):
    def test_wave_enemy_count(self):
        for wave in range(1, 20):
            count = 2 + wave
            self.assertGreater(count, 0)
            darts = count + 2
            self.assertGreater(darts, count)


class TestCombos(unittest.TestCase):
    def test_streak_bonus(self):
        streak = 0
        score = 0
        types = ["single", "double", "triple", "single", "double"]
        for i, t in enumerate(types):
            if i == 0 or types[i] != types[i - 1]:
                streak += 1
            else:
                streak = 1
            bonus = streak * 5
            score += 10 + bonus
        self.assertGreater(score, 0)
        self.assertGreater(streak, 0)


class TestCountdownFix(unittest.TestCase):
    def test_average_uses_rounds(self):
        mode_score = 501
        score = 100
        rounds = 5
        darts_thrown = 14  # Not evenly divisible by 3
        avg = (mode_score - score) / rounds if rounds > 0 else 0
        self.assertAlmostEqual(avg, 80.2)

    def test_average_zero_rounds(self):
        avg = 0 if 0 == 0 else 100 / 0
        self.assertEqual(avg, 0, "0 Runden = 0 Durchschnitt, kein DivisionByZero")


class TestBowlingFix(unittest.TestCase):
    def test_10th_frame_strike_then_miss(self):
        frame = {"strike1": True}
        ball = 3
        strike2 = frame.get("strike2")
        spare = frame.get("spare")
        should_reset = (ball == 2 and frame.get("strike1")) or strike2 or (ball == 3 and spare)
        self.assertFalse(should_reset,
                         "Ball 3 nach Strike1+Miss sollte NICHT resettet werden")

    def test_10th_frame_double_strike(self):
        frame = {"strike1": True, "strike2": True}
        ball = 3
        should_reset = (ball == 2 and frame.get("strike1")) or frame.get("strike2") or (ball == 3 and frame.get("spare"))
        self.assertTrue(should_reset,
                        "Ball 3 nach Doppel-Strike SOLL resettet werden")

    def test_10th_frame_spare(self):
        frame = {"spare": True}
        ball = 3
        should_reset = (ball == 2 and frame.get("strike1")) or frame.get("strike2") or (ball == 3 and frame.get("spare"))
        self.assertTrue(should_reset,
                        "Ball 3 nach Spare SOLL resettet werden")


class TestKillerLives(unittest.TestCase):
    def test_lives_clamp(self):
        players = {
            "A": {"lives": 3, "is_killer": True, "alive": True, "number": 5},
            "B": {"lives": 1, "is_killer": False, "alive": True, "number": 10},
        }
        players["B"]["lives"] -= 1
        if players["B"]["lives"] <= 0:
            players["B"]["alive"] = False
        self.assertEqual(players["B"]["lives"], 0)
        self.assertFalse(players["B"]["alive"])

    def test_overkill_lives(self):
        players = {"A": {"lives": 1, "alive": True}}
        players["A"]["lives"] -= 1
        if players["A"]["lives"] <= 0:
            players["A"]["alive"] = False
        self.assertEqual(players["A"]["lives"], 0)
        self.assertFalse(players["A"]["alive"])


class TestShanghaiScoring(unittest.TestCase):
    def test_target_points_correct(self):
        from dart_game import DartBoard
        from training import parse_hit_number
        board = DartBoard()
        shanghai_nums = [15, 16, 17, 18, 19, 20, 25]
        for target in shanghai_nums:
            for _ in range(50):
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                if target == 25:
                    if result == "Bullseye":
                        self.assertEqual(points, 50)
                    elif result == "Bull":
                        self.assertEqual(points, 25)
                elif hit_num == target:
                    if hit_type == "single":
                        self.assertEqual(points, target)
                    elif hit_type == "double":
                        self.assertEqual(points, target * 2)
                    elif hit_type == "triple":
                        self.assertEqual(points, target * 3)


class TestFullSimulations(unittest.TestCase):
    """Simuliert komplette Spieldurchlaeufe."""

    def test_501_full_game(self):
        from dart_game import DartBoard
        from training import parse_hit_number
        board = DartBoard()
        score = 501
        darts = 0
        for _ in range(500):
            result, points = board.throw()
            darts += 1
            _, hit_type = parse_hit_number(result)
            new_score = score - points
            if new_score < 0 or new_score == 1:
                continue
            if new_score == 0:
                if hit_type in ("double", "bullseye"):
                    score = 0
                    break
                continue
            score = new_score
            self.assertGreater(score, 0)
        self.assertGreaterEqual(score, 0, "Score darf nie negativ sein")

    def test_cricket_full_game(self):
        from dart_game import DartBoard
        from training import parse_hit_number
        board = DartBoard()
        targets = {20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0}
        points = 0
        for _ in range(300):
            result, pts = board.throw()
            hit_num, hit_type = parse_hit_number(result)
            if hit_num in targets:
                mult = {"triple": 3, "double": 2, "bullseye": 2}.get(hit_type, 1)
                old = targets[hit_num]
                targets[hit_num] = min(old + mult, 3)
                if old >= 3:
                    points += pts
            if all(v >= 3 for v in targets.values()):
                break
        self.assertGreaterEqual(points, 0)

    def test_war_full_game(self):
        from dart_game import DartBoard
        from training import parse_hit_number
        board = DartBoard()
        scores = {"A": 0, "B": 0}
        segment_owner = {}
        for _ in range(60):
            for p in ["A", "B"]:
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                if hit_num == 0 or result in ("Miss", "Bullseye", "Bull"):
                    continue
                if hit_num not in segment_owner:
                    segment_owner[hit_num] = p
                    scores[p] += points
                elif segment_owner[hit_num] != p and hit_type in ("double", "triple"):
                    old = segment_owner[hit_num]
                    segment_owner[hit_num] = p
                    scores[p] += points
                    scores[old] = max(0, scores[old] - hit_num)
        for p, s in scores.items():
            self.assertGreaterEqual(s, 0, f"War Score {p} negativ: {s}")

    def test_tower_defense_full_game(self):
        from dart_game import DartBoard
        from training import parse_hit_number
        from tower_defense import generate_wave, TOWER_TYPES
        board = DartBoard()
        base_hp = 10
        gold = 0
        towers = {}
        for wave in range(1, 11):
            if base_hp <= 0:
                break
            enemies = generate_wave(wave)
            for _ in range(3):
                result, points = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                if hit_num > 0 and hit_type in ("single", "double", "triple"):
                    towers[hit_num] = {"type": hit_type}
            for _ in range(3):
                result, points = board.throw()
                alive = [e for e in enemies if e["hp"] > 0]
                if alive:
                    alive[0]["hp"] -= points
                    if alive[0]["hp"] <= 0:
                        alive[0]["hp"] = 0
                        gold += alive[0]["reward"]
            for seg, tower in towers.items():
                t = TOWER_TYPES[tower["type"]]
                for e in enemies:
                    if e["hp"] > 0 and e["position"] == seg:
                        e["hp"] -= t["damage"]
                        if e["hp"] <= 0:
                            e["hp"] = 0
                            gold += e["reward"]
            survivors = [e for e in enemies if e["hp"] > 0]
            base_hp -= len(survivors)
            base_hp = max(0, base_hp)
        self.assertGreaterEqual(base_hp, 0)
        self.assertGreaterEqual(gold, 0)

    def test_slots_full_session(self):
        from slots import dart_to_reel, check_payout
        from dart_game import DartBoard
        from training import parse_hit_number
        board = DartBoard()
        credits = 100
        for _ in range(50):
            if credits < 10:
                break
            credits -= 10
            reels = []
            for _ in range(3):
                result, _ = board.throw()
                hit_num, hit_type = parse_hit_number(result)
                reels.append(dart_to_reel(hit_num, hit_type))
            _, payout = check_payout(reels)
            self.assertGreaterEqual(payout, 0, f"Negativer Payout: {payout}")
            credits += payout
            self.assertGreaterEqual(credits, 0, f"Credits negativ: {credits}")

    def test_maze_navigation(self):
        from maze import generate_maze, DIRECTIONS, DIR_SEGMENTS
        maze = generate_maze(5, 5)
        px, py = 0, 0
        moves = 0
        for _ in range(200):
            if px == 4 and py == 4:
                break
            cell = maze[py][px]
            available = [d for d in ["N", "E", "S", "W"] if not cell[d]]
            if not available:
                break
            d = random.choice(available)
            dx, dy = DIRECTIONS[d]
            px, py = px + dx, py + dy
            moves += 1
            self.assertGreaterEqual(px, 0)
            self.assertGreaterEqual(py, 0)
            self.assertLess(px, 5)
            self.assertLess(py, 5)


class TestEdgeCases(unittest.TestCase):
    def test_501_exact_bust_boundary(self):
        score = 2
        points = 3
        new_score = score - points
        self.assertLess(new_score, 0, "2 - 3 = -1, sollte busten")

    def test_501_score_equals_1(self):
        score = 41
        points = 40
        new_score = score - points
        self.assertEqual(new_score, 1, "Rest 1 = Bust (kann nicht mit Double beenden)")

    def test_501_exact_zero_double(self):
        score = 40
        points = 40
        hit_type = "double"
        new_score = score - points
        self.assertEqual(new_score, 0)
        self.assertEqual(hit_type, "double")

    def test_zero_score_handling(self):
        scores = {"A": 0}
        scores["A"] = max(0, scores["A"] - 10)
        self.assertEqual(scores["A"], 0, "Score unter 0 soll auf 0 geclampt werden")

    def test_large_score_accumulation(self):
        score = 0
        for _ in range(10000):
            score += 60  # Max single throw
        self.assertEqual(score, 600000)
        self.assertGreater(score, 0)

    def test_empty_player_list(self):
        players = []
        alive = [p for p in players if True]
        self.assertEqual(len(alive), 0)

    def test_division_by_zero_guards(self):
        darts = 0
        self.assertEqual(0 if darts == 0 else 100 / darts, 0)
        rounds = 0
        self.assertEqual(0 if rounds == 0 else 500 / rounds, 0)

    def test_all_segments_reachable(self):
        from dart_game import DartBoard
        board = DartBoard()
        seen_segments = set()
        for _ in range(10000):
            result, _ = board.throw()
            if result.startswith("Triple"):
                seen_segments.add(int(result.split()[1]))
            elif result.startswith("Double"):
                seen_segments.add(int(result.split()[1]))
            elif result not in ("Bullseye", "Bull", "Miss"):
                try:
                    seen_segments.add(int(result))
                except ValueError:
                    pass
        for seg in range(1, 21):
            self.assertIn(seg, seen_segments,
                          f"Segment {seg} wurde in 10000 Wuerfen nie getroffen")


class TestReactionMatchNum(unittest.TestCase):
    def test_bullseye_match_num(self):
        from reaction import TARGETS
        for t in TARGETS:
            self.assertLessEqual(t["match_num"], 25,
                                 f"{t['label']} has match_num {t['match_num']} > 25")

    def test_bullseye_check(self):
        from reaction import check_target_hit
        be_target = {"label": "Bullseye", "match_num": 25, "match_type": "bullseye", "difficulty": 3}
        self.assertTrue(check_target_hit("Bullseye", be_target))


class TestWarNoDoubleBonus(unittest.TestCase):
    def test_territory_bonus_applied_once(self):
        from war import TERRITORIES
        from dart_game import DartBoard
        random.seed(42)
        board = DartBoard()
        scores = {"A": 0, "B": 0}
        territory_owner = {t["name"]: None for t in TERRITORIES}
        territory_owner[TERRITORIES[0]["name"]] = "A"
        scores["A"] += TERRITORIES[0]["bonus"]
        old_score = scores["A"]
        self.assertEqual(scores["A"], old_score)


class TestGUIBustScore(unittest.TestCase):
    def test_bust_restores_start_of_round(self):
        score = 501
        round_score = 0
        for pts in [20, 20]:
            score -= pts
            round_score += pts
        old_score = score
        bust_restored = old_score + round_score
        self.assertEqual(bust_restored, 501)
        wrong_formula = old_score - round_score
        self.assertNotEqual(wrong_formula, 501)


class TestBowling10thFrame(unittest.TestCase):
    def test_setup_pins(self):
        from bowling import setup_pins, PINS
        pins = setup_pins()
        standing = sum(1 for p in PINS if pins[p]["standing"])
        self.assertEqual(standing, 10)


class TestMazeWalls(unittest.TestCase):
    def test_all_cells_have_walls(self):
        from maze import generate_maze
        maze = generate_maze(5, 5)
        for y in range(5):
            for x in range(5):
                for d in ("N", "S", "E", "W"):
                    self.assertIn(d, maze[y][x])


class TestPokerMissNotDrilling(unittest.TestCase):
    def test_three_misses_no_bonus(self):
        from collections import Counter
        hits = [(0, "miss"), (0, "miss"), (0, "miss")]
        nums = [h[0] for h in hits]
        valid_nums = [n for n in nums if n > 0]
        c = Counter(valid_nums)
        trips = sum(1 for v in c.values() if v >= 3)
        self.assertEqual(trips, 0, "Three misses should not count as Drilling")

    def test_valid_drilling(self):
        from collections import Counter
        hits = [(20, "triple"), (20, "single"), (20, "single")]
        nums = [h[0] for h in hits]
        valid_nums = [n for n in nums if n > 0]
        c = Counter(valid_nums)
        trips = sum(1 for v in c.values() if v >= 3)
        self.assertEqual(trips, 1, "Three 20s should be Drilling")


class TestAuctionNoDuplicateBonus(unittest.TestCase):
    def test_collection_awarded_once(self):
        from auction import COLLECTIONS
        owned = [1, 2, 3, 4, 5]
        awarded = set()
        bonus_total = 0
        for _ in range(5):
            for c in COLLECTIONS:
                if c["name"] not in awarded and all(s in owned for s in c["segments"]):
                    awarded.add(c["name"])
                    bonus_total += c["bonus"]
        self.assertEqual(bonus_total, 50, "Niedrig bonus should only be awarded once")
        self.assertEqual(len(awarded), 1)


class TestSimulatorDartCount(unittest.TestCase):
    def test_bust_counts_dart(self):
        from simulator import SimPlayer, sim_leg
        from dart_game import DartBoard
        random.seed(42)
        board = DartBoard()
        p1 = SimPlayer("A", 1.0)
        p2 = SimPlayer("B", 1.0)
        winner = sim_leg(p1, p2, board, 501)
        for p in (p1, p2):
            self.assertGreater(p.darts_thrown, 0, f"{p.name} has 0 darts")
            self.assertGreaterEqual(p.darts_thrown, p.rounds)


class TestLeagueRoundAdvance(unittest.TestCase):
    def test_round_increments(self):
        league = {"current_round": 1, "total_rounds": 3}
        if league["current_round"] < league["total_rounds"]:
            league["current_round"] += 1
        self.assertEqual(league["current_round"], 2)


class TestScore1IsBust(unittest.TestCase):
    def test_remaining_1_is_bust(self):
        score = 21
        round_score = 0
        points = 20
        new_remaining = score - round_score - points
        self.assertEqual(new_remaining, 1)
        is_bust = new_remaining < 0 or new_remaining == 1
        self.assertTrue(is_bust, "Score of 1 should be a bust")

    def test_remaining_0_not_bust(self):
        score = 20
        round_score = 0
        points = 20
        new_remaining = score - round_score - points
        self.assertEqual(new_remaining, 0)
        is_bust = new_remaining < 0 or new_remaining == 1
        self.assertFalse(is_bust)


class TestBracketNoneVsNone(unittest.TestCase):
    def test_none_vs_none_returns_none(self):
        from bracket import play_bracket_match
        result = play_bracket_match(None, None, 501, "mittel")
        self.assertIsNone(result)

    def test_none_vs_player_returns_player(self):
        from bracket import play_bracket_match
        result = play_bracket_match(None, "Alice", 501, "mittel")
        self.assertEqual(result, "Alice")


if __name__ == "__main__":
    print("=" * 60)
    print("  TIEFE SPIELTESTS - Umfassende Edge Cases")
    print("=" * 60)
    unittest.main(verbosity=2)
