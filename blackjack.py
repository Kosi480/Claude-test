#!/usr/bin/env python3
"""Dart Blackjack: Wirf Darts, um 21 zu erreichen - ohne zu überziehen."""

import random
from dart_game import DartBoard, Color, throw_animation


def dart_to_card_value(result, points):
    if result == "Bullseye":
        return 11, "Ass (11)"
    if result == "Bull":
        return 10, "10"
    if points == 0 or result == "Miss":
        val = random.choice([2, 3])
        return val, f"Niete ({val})"

    parts = result.split()
    if len(parts) == 2:
        prefix = parts[0]
        try:
            num = int(parts[1])
        except ValueError:
            return min(points, 10), str(min(points, 10))

        if prefix == "Triple":
            return min(num, 10), f"Bild ({min(num, 10)})"
        elif prefix == "Double":
            val = min(num, 10)
            return val, str(val)
        else:
            val = min(num, 10)
            return val, str(val)

    try:
        num = int(parts[0])
        return min(num, 10), str(min(num, 10))
    except (ValueError, IndexError):
        return min(points, 10), str(min(points, 10))


def display_hand(name, hand, hide_first=False):
    if hide_first and len(hand) > 0:
        cards = f"[??] "
        cards += " ".join(f"[{c['label']}]" for c in hand[1:])
        visible_total = sum(c["value"] for c in hand[1:])
        print(f"  {name}: {cards} = {Color.muted(f'{visible_total}+?')}")
    else:
        cards = " ".join(f"[{c['label']}]" for c in hand)
        total = sum(c["value"] for c in hand)
        color = Color.RED if total > 21 else Color.GREEN if total == 21 else Color.YELLOW
        print(f"  {name}: {cards} = {color}{Color.BOLD}{total}{Color.RESET}")


def soft_adjust(hand):
    total = sum(c["value"] for c in hand)
    if total > 21:
        for card in hand:
            if card["value"] == 11:
                card["value"] = 1
                card["label"] = "Ass (1)"
                total -= 10
                if total <= 21:
                    break
    return total


def dealer_play(board, dealer_hand):
    print(f"\n  {Color.BOLD}{Color.CYAN}Dealer deckt auf:{Color.RESET}")
    display_hand("Dealer", dealer_hand)

    while True:
        total = sum(c["value"] for c in dealer_hand)
        if total >= 17:
            break

        print(f"  Dealer zieht...")
        throw_animation()
        result, points = board.throw()
        value, label = dart_to_card_value(result, points)
        dealer_hand.append({"value": value, "label": label})
        print(f"    -> {Color.colorize_result(result, points)} = [{label}]")
        soft_adjust(dealer_hand)
        display_hand("Dealer", dealer_hand)

    return sum(c["value"] for c in dealer_hand)


def run_blackjack(player_names):
    board = DartBoard()

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART BLACKJACK':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info('Versuche mit Dartwürfen 21 zu erreichen!')}")
    print(f"  Bullseye = Ass (11/1)")
    print(f"  Bull = 10")
    print(f"  Segment = Wert (max 10)")
    print(f"  Miss = 2 oder 3")
    print(f"  Über 21 = BUST!")
    print(f"{Color.muted('═' * 50)}")

    num_rounds = 5
    chips = {name: 100 for name in player_names}

    for round_num in range(1, num_rounds + 1):
        active_players = [n for n in player_names if chips[n] > 0]
        if not active_players:
            break

        print(f"\n{Color.BOLD}{Color.MAGENTA}  ═══ Runde {round_num}/{num_rounds} ═══{Color.RESET}")
        for name in player_names:
            status = f"{Color.GREEN}{chips[name]}{Color.RESET}" if chips[name] > 0 else f"{Color.RED}Pleite{Color.RESET}"
            print(f"  {name}: {status} Chips")

        bets = {}
        hands = {}

        for name in active_players:
            while True:
                try:
                    bet_str = input(f"  {name}, Einsatz (1-{chips[name]}): ").strip()
                    bet = int(bet_str)
                    if 1 <= bet <= chips[name]:
                        bets[name] = bet
                        break
                    print(f"    Bitte 1-{chips[name]} eingeben.")
                except ValueError:
                    bets[name] = min(10, chips[name])
                    break

        dealer_hand = []
        print(f"\n  {Color.BOLD}Dealer teilt aus...{Color.RESET}")

        for name in active_players:
            hands[name] = []
            for _ in range(2):
                throw_animation()
                result, points = board.throw()
                value, label = dart_to_card_value(result, points)
                hands[name].append({"value": value, "label": label})

        for _ in range(2):
            throw_animation()
            result, points = board.throw()
            value, label = dart_to_card_value(result, points)
            dealer_hand.append({"value": value, "label": label})

        print()
        for name in active_players:
            soft_adjust(hands[name])
            display_hand(name, hands[name])
        display_hand("Dealer", dealer_hand, hide_first=True)

        busted = set()

        for name in active_players:
            total = sum(c["value"] for c in hands[name])

            if total == 21:
                print(f"\n  {Color.BOLD}{Color.YELLOW}{name}: BLACKJACK!{Color.RESET}")
                continue

            print(f"\n  {Color.BOLD}{name}{Color.RESET} ist dran (Einsatz: {bets[name]})")

            while True:
                total = sum(c["value"] for c in hands[name])
                if total >= 21:
                    break

                action = input(f"    [h]it / [s]tand: ").strip().lower()
                if action == "s":
                    print(f"    {name} hält bei {Color.BOLD}{total}{Color.RESET}")
                    break

                print(f"    {name} zieht...")
                throw_animation()
                result, points = board.throw()
                value, label = dart_to_card_value(result, points)
                hands[name].append({"value": value, "label": label})
                print(f"    -> {Color.colorize_result(result, points)} = [{label}]")

                total = soft_adjust(hands[name])
                display_hand(name, hands[name])

                if total > 21:
                    print(f"    {Color.RED}{Color.BOLD}BUST! {name} ist raus!{Color.RESET}")
                    busted.add(name)
                    break
                elif total == 21:
                    print(f"    {Color.GREEN}{Color.BOLD}21! Perfekt!{Color.RESET}")
                    break

        non_busted = [n for n in active_players if n not in busted]
        if non_busted:
            dealer_total = dealer_play(board, dealer_hand)
            dealer_bust = dealer_total > 21
            if dealer_bust:
                print(f"  {Color.RED}{Color.BOLD}Dealer BUST!{Color.RESET}")
        else:
            dealer_total = sum(c["value"] for c in dealer_hand)
            dealer_bust = False

        print(f"\n  {Color.muted('─' * 40)}")
        print(f"  {Color.BOLD}Ergebnis Runde {round_num}:{Color.RESET}")

        for name in active_players:
            player_total = sum(c["value"] for c in hands[name])
            bet = bets[name]
            is_bj = (len(hands[name]) == 2 and player_total == 21)

            if name in busted:
                chips[name] -= bet
                print(f"  {name}: BUST - {Color.RED}-{bet} Chips{Color.RESET}")
            elif is_bj:
                winnings = int(bet * 1.5)
                chips[name] += winnings
                print(f"  {name}: BLACKJACK! - {Color.YELLOW}+{winnings} Chips{Color.RESET}")
            elif dealer_bust:
                chips[name] += bet
                print(f"  {name}: Dealer bust - {Color.GREEN}+{bet} Chips{Color.RESET}")
            elif player_total > dealer_total:
                chips[name] += bet
                print(f"  {name}: {player_total} > {dealer_total} - {Color.GREEN}+{bet} Chips{Color.RESET}")
            elif player_total == dealer_total:
                print(f"  {name}: {player_total} = {dealer_total} - {Color.YELLOW}Push (±0){Color.RESET}")
            else:
                chips[name] -= bet
                print(f"  {name}: {player_total} < {dealer_total} - {Color.RED}-{bet} Chips{Color.RESET}")

        print(f"  {Color.muted('─' * 40)}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'BLACKJACK - ENDERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    sorted_players = sorted(chips.items(), key=lambda x: -x[1])
    for i, (name, total_chips) in enumerate(sorted_players):
        profit = total_chips - 100
        profit_str = f"+{profit}" if profit >= 0 else str(profit)
        color = Color.GREEN if profit > 0 else Color.RED if profit < 0 else Color.YELLOW
        medal = {0: "🃏", 1: "🥈", 2: "🥉"}.get(i, "  ")
        print(f"  {medal} {name}: {Color.BOLD}{total_chips}{Color.RESET} Chips ({color}{profit_str}{Color.RESET})")

    winner_name = sorted_players[0][0]
    print(f"\n  {Color.BOLD}{Color.YELLOW}{winner_name} gewinnt Dart Blackjack!{Color.RESET}")
    print(f"{Color.muted('═' * 50)}")
    return winner_name


def blackjack_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART BLACKJACK':^50}"))
    print(Color.muted("=" * 50))

    print(f"\n  {Color.info('21 erreichen - ohne zu überziehen!')}")
    print("  Dartwürfe bestimmen deine Kartenwerte.\n")

    try:
        num = int(input("  Anzahl Spieler (1-4): ").strip())
        num = max(1, min(4, num))
    except ValueError:
        num = 1

    names = []
    for i in range(num):
        name = input(f"  Name Spieler {i + 1}: ").strip()
        if not name:
            name = f"Spieler {i + 1}"
        names.append(name)

    input(f"\n  {Color.muted('[Enter] zum Starten...')}")

    run_blackjack(names)
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")
