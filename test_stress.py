#!/usr/bin/env python3
"""Stress-Tests: Tausende Simulationen pro Spielmodus, sucht nach Crashes und Edge Cases."""

import sys
import random
import traceback

random.seed(999)

PASS = 0
FAIL = 0
BUGS = []


def run_test(name, fn, iterations=100):
    global PASS, FAIL
    try:
        for i in range(iterations):
            fn(i)
        PASS += 1
        print(f"  PASS: {name} ({iterations}x)")
    except Exception as e:
        FAIL += 1
        msg = f"{name}: {e}"
        BUGS.append(msg)
        print(f"  FAIL: {msg}")
        traceback.print_exc()


def stress_dartboard(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    for _ in range(100):
        r, p = board.throw()
        assert p >= 0, f"Neg points: {r}={p}"
        assert p <= 60 or r == "Bullseye", f"Points>60: {r}={p}"


def stress_501(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    score = 501
    for _ in range(500):
        r, p = board.throw()
        _, ht = parse_hit_number(r)
        ns = score - p
        if ns < 0 or ns == 1:
            continue
        if ns == 0:
            if ht in ("double", "bullseye"):
                score = 0
                break
            continue
        score = ns
    assert score >= 0, f"Score negativ: {score}"


def stress_cricket(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    targets = {20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0}
    pts = 0
    for _ in range(300):
        r, p = board.throw()
        hn, ht = parse_hit_number(r)
        if hn in targets:
            m = {"triple": 3, "double": 2, "bullseye": 2}.get(ht, 1)
            old = targets[hn]
            targets[hn] = min(old + m, 3)
            if old >= 3:
                pts += p
        if all(v >= 3 for v in targets.values()):
            break
    assert pts >= 0, f"Cricket pts neg: {pts}"


def stress_blackjack(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from blackjack import dart_to_card_value
    board = DartBoard()
    for _ in range(20):
        hand = []
        for _ in range(5):
            r, p = board.throw()
            v, lbl = dart_to_card_value(r, p)
            assert v >= 0, f"Neg card: {r}={p}->{v}"
            assert v <= 11, f"Card>11: {v}"
            assert str(v) in lbl or "Niete" in lbl or "Ass" in lbl or "Bild" in lbl, \
                f"Label mismatch: v={v} lbl='{lbl}'"
            hand.append(v)
            total = sum(hand)
            while total > 21 and 11 in hand:
                hand[hand.index(11)] = 1
                total = sum(hand)
            assert total >= 0


def stress_war(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    scores = {"A": 0, "B": 0}
    seg_own = {}
    for _ in range(60):
        for p in ("A", "B"):
            r, pts = board.throw()
            hn, ht = parse_hit_number(r)
            if hn == 0 or r in ("Miss", "Bullseye", "Bull"):
                if r == "Bullseye":
                    scores[p] += 25
                elif r == "Bull":
                    scores[p] += 10
                continue
            if hn not in seg_own:
                seg_own[hn] = p
                scores[p] += pts
            elif seg_own[hn] == p:
                scores[p] += 5
            elif ht in ("double", "triple"):
                old = seg_own[hn]
                seg_own[hn] = p
                scores[p] += pts
                scores[old] = max(0, scores[old] - hn)
    for p, s in scores.items():
        assert s >= 0, f"War {p} neg: {s}"


def stress_tower_defense(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from tower_defense import generate_wave, TOWER_TYPES
    board = DartBoard()
    hp = 10
    gold = 0
    for w in range(1, 11):
        if hp <= 0:
            break
        enemies = generate_wave(w)
        for e in enemies:
            assert e["hp"] > 0
            assert e["hp"] == e["max_hp"]
        for _ in range(3):
            _, pts = board.throw()
            alive = [e for e in enemies if e["hp"] > 0]
            if alive:
                alive[0]["hp"] -= pts
                if alive[0]["hp"] <= 0:
                    alive[0]["hp"] = 0
                    gold += alive[0]["reward"]
        surv = [e for e in enemies if e["hp"] > 0]
        hp -= len(surv)
        hp = max(0, hp)
    assert hp >= 0
    assert gold >= 0


def stress_slots(seed):
    random.seed(seed)
    from slots import dart_to_reel, check_payout
    credits = 100
    for _ in range(100):
        if credits < 10:
            break
        credits -= 10
        reels = [random.randint(0, 5) for _ in range(3)]
        _, pay = check_payout(reels)
        assert pay >= 0, f"Neg payout: {pay}"
        credits += pay
    assert credits >= 0, f"Credits neg: {credits}"


def stress_auction(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    budgets = {"A": 500, "B": 500}
    for _ in range(15):
        bids = {}
        for p in ("A", "B"):
            _, pts = board.throw()
            bids[p] = min(pts, budgets[p])
        winner = max(bids, key=bids.get)
        budgets[winner] -= bids[winner]
        assert budgets[winner] >= 0, f"Budget neg: {winner}={budgets[winner]}"


def stress_maze(seed):
    random.seed(seed)
    from maze import generate_maze, DIRECTIONS
    for sz in (3, 5, 7):
        maze = generate_maze(sz, sz)
        visited = set()
        stack = [(0, 0)]
        visited.add((0, 0))
        while stack:
            x, y = stack.pop()
            for d, (dx, dy) in DIRECTIONS.items():
                if not maze[y][x][d]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < sz and 0 <= ny < sz and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        stack.append((nx, ny))
        assert (sz-1, sz-1) in visited, f"Maze {sz}x{sz} nicht loesbar!"


def stress_endurance(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    hp = 100
    thresh = 15
    for _ in range(100):
        rt = 0
        for _ in range(3):
            _, p = board.throw()
            rt += p
        if rt < thresh:
            hp -= max(5, thresh - rt)
        else:
            hp += min(5, 100 - hp)
        assert hp <= 100, f"HP>100: {hp}"
        thresh = min(thresh + 2, 60)
        if hp <= 0:
            break
    assert hp <= 100


def stress_survival(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    hp = 50
    score = 0
    for w in range(1, 20):
        enemies = 2 + w
        killed = 0
        for _ in range(enemies + 2):
            _, p = board.throw()
            if p >= 10 + w * 3:
                killed += 1
                score += p * 2
            else:
                score += p
        rem = enemies - killed
        if rem > 0:
            hp -= rem * 5
        if hp <= 0:
            break
    assert score >= 0, f"Survival score neg: {score}"


def stress_combos(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    score = 0
    streak = 0
    last = None
    for _ in range(30):
        r, p = board.throw()
        _, ht = parse_hit_number(r)
        if ht in ("single", "double", "triple"):
            if last != ht:
                streak += 1
            else:
                streak = 1
            score += p + streak * 5
            last = ht
        else:
            streak = 0
            last = None
            score += p
    assert score >= 0, f"Combo score neg: {score}"


def stress_killer(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    segs = random.sample(range(1, 21), 4)
    players = {}
    for i, n in enumerate(["A", "B", "C", "D"]):
        players[n] = {"number": segs[i], "lives": 3, "is_killer": False, "alive": True}
    for _ in range(200):
        alive = [n for n, p in players.items() if p["alive"]]
        if len(alive) <= 1:
            break
        for n in alive:
            p = players[n]
            for _ in range(3):
                r, pts = board.throw()
                hn, ht = parse_hit_number(r)
                if ht == "double":
                    if hn == p["number"] and not p["is_killer"]:
                        p["is_killer"] = True
                    elif p["is_killer"]:
                        for vn, vd in players.items():
                            if vn != n and vd["alive"] and vd["number"] == hn:
                                vd["lives"] -= 1
                                if vd["lives"] <= 0:
                                    vd["alive"] = False
                                break
            if len([x for x in players.values() if x["alive"]]) <= 1:
                break
    for n, p in players.items():
        assert p["lives"] >= 0, f"Killer {n} lives neg: {p['lives']}"


def stress_shanghai(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    nums = [15, 16, 17, 18, 19, 20, 25]
    scores = {"A": 0, "B": 0}
    for target in nums:
        for p in ("A", "B"):
            rp = 0
            for _ in range(3):
                r, pts = board.throw()
                hn, ht = parse_hit_number(r)
                if target == 25:
                    if r == "Bullseye":
                        rp += 50
                    elif r == "Bull":
                        rp += 25
                elif hn == target:
                    rp += {"double": target * 2, "triple": target * 3}.get(ht, target)
            assert rp >= 0, f"Shanghai round neg: {rp}"
            scores[p] += rp
    for p, s in scores.items():
        assert s >= 0, f"Shanghai {p} neg: {s}"


def stress_lucky_number(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    scores = {"A": 0, "B": 0}
    for _ in range(8):
        lucky = random.randint(1, 20)
        for p in ("A", "B"):
            for _ in range(3):
                r, pts = board.throw()
                hn, ht = parse_hit_number(r)
                if hn == lucky:
                    m = {"triple": 3, "double": 2}.get(ht, 1)
                    scores[p] += lucky * m * 2
                else:
                    scores[p] += pts
    for p, s in scores.items():
        assert s >= 0, f"Lucky {p} neg: {s}"


def stress_poker(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    scores = {"A": 0, "B": 0}
    for _ in range(5):
        for p in ("A", "B"):
            hand = []
            for _ in range(3):
                r, pts = board.throw()
                hn, ht = parse_hit_number(r)
                hand.append((hn, ht))
            nums = [h[0] for h in hand]
            from collections import Counter
            c = Counter(nums)
            bonus = 0
            if max(c.values()) >= 3:
                bonus = 100
            elif sum(1 for v in c.values() if v >= 2) >= 2:
                bonus = 75
            elif max(c.values()) >= 2:
                bonus = 30
            scores[p] += sum(nums) + bonus
    for p, s in scores.items():
        assert s >= 0, f"Poker {p} neg: {s}"


def stress_bingo(seed):
    random.seed(seed)
    from bingo import generate_bingo_card, check_bingo
    for _ in range(20):
        card = generate_bingo_card(3)
        assert len(card) == 3
        for row in card:
            assert len(row) == 3
            for cell in row:
                assert "label" in cell
                assert "hit" in cell


def stress_golf(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    from golf import MAX_DARTS_PER_HOLE
    board = DartBoard()
    targets = [20, 19, 18, 17, 16, 15, 14, 13, 12]
    pars = [3, 3, 4, 3, 4, 3, 4, 3, 4]
    total = 0
    for hole_idx in range(9):
        darts = 0
        hit = False
        for _ in range(MAX_DARTS_PER_HOLE):
            r, p = board.throw()
            hn, _ = parse_hit_number(r)
            darts += 1
            if hn == targets[hole_idx]:
                hit = True
                break
        if not hit:
            darts = MAX_DARTS_PER_HOLE
        diff = darts - pars[hole_idx]
        total += diff
    # Golf score CAN be negative (under par) - that's fine


def stress_penalty(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    g1, g2 = 0, 0
    r1, r2 = [], []
    for rd in range(1, 6):
        _, p = board.throw()
        scored = p >= 15
        r1.append(scored)
        if scored:
            g1 += 1
        remaining = 5 - rd
        if g2 + remaining + 1 < g1 and rd >= 3:
            for _ in range(remaining + 1):
                r2.append(False)
            break
        _, p = board.throw()
        scored = p >= 15
        r2.append(scored)
        if scored:
            g2 += 1
    assert len(r1) <= 5
    assert len(r2) <= 5
    assert g1 >= 0
    assert g2 >= 0


def stress_roulette(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    scores = {"A": 0, "B": 0}
    for _ in range(8):
        for p in ("A", "B"):
            total = 0
            for _ in range(3):
                _, pts = board.throw()
                total += pts
            effect = random.choice(["none", "double", "half", "swap"])
            if effect == "double":
                total *= 2
            elif effect == "half":
                total = int(total * 0.5)
            if effect == "swap":
                other = "B" if p == "A" else "A"
                scores[p], scores[other] = scores[other], scores[p]
                scores[p] += total
            else:
                scores[p] += total
    for p, s in scores.items():
        assert s >= 0, f"Roulette {p} neg: {s}"


def stress_duel(seed):
    random.seed(seed)
    from dart_game import DartBoard
    board = DartBoard()
    hp = {"A": 100, "B": 100}
    for _ in range(100):
        for p, opp in [("A", "B"), ("B", "A")]:
            _, pts = board.throw()
            hp[opp] = max(0, hp[opp] - pts)
            if hp[opp] <= 0:
                break
        if hp["A"] <= 0 or hp["B"] <= 0:
            break
    assert hp["A"] >= 0
    assert hp["B"] >= 0


def stress_countdown(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    score = 501
    darts = 0
    rounds = 0
    for _ in range(100):
        round_score = 0
        rounds += 1
        for _ in range(3):
            r, p = board.throw()
            _, ht = parse_hit_number(r)
            darts += 1
            ns = score - round_score - p
            if ns < 0 or ns == 1:
                round_score = 0
                break
            if ns == 0 and ht in ("double", "bullseye"):
                score = 0
                break
            round_score += p
        score -= round_score
        if score <= 0:
            score = max(0, score)
            break
    assert score >= 0, f"Countdown neg: {score}"
    if rounds > 0:
        avg = (501 - score) / rounds
        assert avg >= 0


def stress_puzzle(seed):
    random.seed(seed)
    from puzzle import generate_puzzle, generate_difference
    for _ in range(20):
        seq, answer, hint = generate_puzzle()
        assert 1 <= answer <= 20, f"Answer out of range: {answer} ({hint})"
        assert isinstance(answer, int), f"Non-int answer: {answer}"
    for _ in range(10):
        seq, answer, hint = generate_difference()
        if hint == "Wachsende Differenzen":
            all_vals = seq + [answer]
            diffs = [all_vals[j + 1] - all_vals[j] for j in range(len(all_vals) - 1)]
            diff_of_diffs = [diffs[j + 1] - diffs[j] for j in range(len(diffs) - 1)]
            assert len(set(diff_of_diffs)) <= 1, f"Inconsistent diffs: {seq} -> {answer}"


def stress_parse_hit(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    for _ in range(100):
        result, points = board.throw()
        hit_num, hit_type = parse_hit_number(result)
        assert hit_num >= 0, f"Neg hit_num: {result}"
        assert hit_type in ("single", "double", "triple", "bullseye", "bull", "miss"), \
            f"Bad hit_type: {hit_type} for {result}"
        if hit_type == "single":
            assert 1 <= hit_num <= 20, f"Single out of range: {hit_num}"
        elif hit_type == "double":
            assert 1 <= hit_num <= 20, f"Double out of range: {hit_num}"
        elif hit_type == "triple":
            assert 1 <= hit_num <= 20, f"Triple out of range: {hit_num}"
    for fmt in ["Single 20", "Double 10", "Triple 19", "5", "Bullseye", "Bull", "Miss"]:
        num, typ = parse_hit_number(fmt)
        assert num >= 0
        assert typ != "miss" or fmt == "Miss", f"Failed to parse: {fmt} -> {num},{typ}"


def stress_memory(seed):
    random.seed(seed)
    from memory import create_memory_board, get_segment_from_throw
    from dart_game import DartBoard
    board = DartBoard()
    mem_board, segments = create_memory_board(6)
    assert len(segments) == 12, f"Expected 12 segments, got {len(segments)}"
    symbols = [mem_board[s]["symbol"] for s in segments]
    from collections import Counter
    counts = Counter(symbols)
    for sym, cnt in counts.items():
        assert cnt == 2, f"Symbol {sym} appears {cnt} times, expected 2"
    for _ in range(50):
        r, p = board.throw()
        seg = get_segment_from_throw(r)
        assert seg >= 0, f"Negative segment: {seg} for {r}"


def stress_treasure(seed):
    random.seed(seed)
    from treasure import create_map
    grid, treasures = create_map()
    assert grid is not None
    assert len(grid) > 0
    assert len(grid[0]) > 0
    t_count = sum(1 for row in grid for cell in row if cell == "T")
    assert t_count >= 1, f"No treasures on map"
    assert len(treasures) >= 1, f"Empty treasures list"


def stress_world_tour(seed):
    random.seed(seed)
    from dart_game import DartBoard
    from training import parse_hit_number
    board = DartBoard()
    score = 501
    darts = 0
    for _ in range(200):
        r, p = board.throw()
        _, ht = parse_hit_number(r)
        darts += 1
        if score - p < 0 or score - p == 1:
            continue
        if score - p == 0 and ht in ("double", "bullseye"):
            score = 0
            break
        score -= p
    assert score >= 0, f"World tour 501 went negative: {score}"


def stress_bowling(seed):
    random.seed(seed)
    from bowling import setup_pins, check_hit, PINS
    from dart_game import DartBoard
    board = DartBoard()
    pins = setup_pins()
    total_knocked = 0
    for _ in range(12):
        r, p = board.throw()
        knocked = check_hit(r, pins)
        total_knocked += len(knocked)
        standing = sum(1 for pin in PINS if pins[pin]["standing"])
        assert standing >= 0, f"Negative standing pins"
        if standing == 0:
            pins = setup_pins()


def stress_reaction(seed):
    random.seed(seed)
    from reaction import TARGETS, check_target_hit
    from dart_game import DartBoard
    board = DartBoard()
    for target in TARGETS:
        for _ in range(20):
            r, p = board.throw()
            hit = check_target_hit(r, target)
            assert isinstance(hit, bool), f"check_target_hit must return bool"
        assert target["match_num"] <= 25, f"match_num {target['match_num']} > 25 for {target['label']}"


def stress_maze_display(seed):
    random.seed(seed)
    from maze import generate_maze
    maze = generate_maze(5, 5)
    assert len(maze) == 5
    assert len(maze[0]) == 5
    for y in range(5):
        for x in range(5):
            cell = maze[y][x]
            assert "N" in cell and "S" in cell and "E" in cell and "W" in cell


def stress_party(seed):
    random.seed(seed)
    from party import calc_score, parse_result
    from dart_game import DartBoard
    board = DartBoard()
    for score_type in ["max_points", "min_points", "even_only", "odd_only",
                       "doubles_only", "triples_only", "bull_only",
                       "low_numbers", "high_numbers"]:
        throws = []
        for _ in range(3):
            r, p = board.throw()
            throws.append(parse_result(r, p))
        score = calc_score(throws, score_type)
        if score_type == "min_points":
            assert score <= 0, f"min_points should be <= 0, got {score}"
        else:
            assert score >= 0, f"{score_type} should be >= 0, got {score}"


def stress_daily(seed):
    random.seed(seed)
    from daily import load_daily_progress
    progress = load_daily_progress()
    assert isinstance(progress, dict)


def main():
    print("=" * 60)
    print("  STRESS-TESTS: 100 Iterationen pro Spielmodus")
    print("=" * 60)

    tests = [
        ("DartBoard", stress_dartboard, 200),
        ("501 Spiel", stress_501, 100),
        ("Cricket", stress_cricket, 100),
        ("Blackjack", stress_blackjack, 100),
        ("War", stress_war, 100),
        ("Tower Defense", stress_tower_defense, 100),
        ("Slots", stress_slots, 200),
        ("Auction", stress_auction, 100),
        ("Maze", stress_maze, 50),
        ("Endurance", stress_endurance, 100),
        ("Survival", stress_survival, 100),
        ("Combos", stress_combos, 100),
        ("Killer", stress_killer, 50),
        ("Shanghai", stress_shanghai, 100),
        ("Lucky Number", stress_lucky_number, 100),
        ("Poker", stress_poker, 100),
        ("Bingo", stress_bingo, 50),
        ("Golf", stress_golf, 100),
        ("Penalty", stress_penalty, 100),
        ("Roulette", stress_roulette, 100),
        ("Duel", stress_duel, 100),
        ("Countdown", stress_countdown, 100),
        ("Puzzle", stress_puzzle, 100),
        ("Memory", stress_memory, 50),
        ("Treasure", stress_treasure, 50),
        ("WorldTour501", stress_world_tour, 100),
        ("ParseHit", stress_parse_hit, 100),
        ("Bowling", stress_bowling, 50),
        ("Reaction", stress_reaction, 50),
        ("MazeDisplay", stress_maze_display, 50),
        ("Party", stress_party, 100),
        ("Daily", stress_daily, 50),
    ]

    for name, fn, iters in tests:
        run_test(name, fn, iters)

    print(f"\n{'=' * 60}")
    print(f"  ERGEBNIS: {PASS}/{PASS+FAIL} bestanden")
    print(f"{'=' * 60}")

    if BUGS:
        print(f"\n  BUGS ({len(BUGS)}):")
        for b in BUGS:
            print(f"    !! {b}")
        return 1
    else:
        print("\n  ALLE STRESS-TESTS BESTANDEN!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
