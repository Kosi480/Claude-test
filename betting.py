#!/usr/bin/env python3
"""Virtuelles Wettsystem mit Münzen für Dart-Spiele."""

import json
import os
from datetime import datetime
from dart_game import Color

WALLET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wallets.json")
STARTING_COINS = 500
DAILY_BONUS = 100
BET_MULTIPLIERS = {
    "sicher": 1.5,
    "normal": 2.0,
    "riskant": 3.0,
    "verrückt": 5.0,
}


class Wallet:
    @staticmethod
    def load_all():
        if os.path.exists(WALLET_FILE):
            with open(WALLET_FILE, "r") as f:
                return json.load(f)
        return {}

    @staticmethod
    def save_all(wallets):
        with open(WALLET_FILE, "w") as f:
            json.dump(wallets, f, indent=2, ensure_ascii=False)

    @classmethod
    def get_or_create(cls, name):
        wallets = cls.load_all()
        if name not in wallets:
            wallets[name] = {
                "coins": STARTING_COINS,
                "total_earned": 0,
                "total_lost": 0,
                "total_bets": 0,
                "bets_won": 0,
                "biggest_win": 0,
                "biggest_loss": 0,
                "last_daily": "",
            }
            cls.save_all(wallets)
        return wallets[name]

    @classmethod
    def add_coins(cls, name, amount):
        wallets = cls.load_all()
        if name not in wallets:
            cls.get_or_create(name)
            wallets = cls.load_all()
        wallets[name]["coins"] += amount
        if amount > 0:
            wallets[name]["total_earned"] += amount
        cls.save_all(wallets)
        return wallets[name]["coins"]

    @classmethod
    def remove_coins(cls, name, amount):
        wallets = cls.load_all()
        if name not in wallets:
            return 0
        wallets[name]["coins"] = max(0, wallets[name]["coins"] - amount)
        wallets[name]["total_lost"] += amount
        cls.save_all(wallets)
        return wallets[name]["coins"]

    @classmethod
    def claim_daily(cls, name):
        wallets = cls.load_all()
        if name not in wallets:
            cls.get_or_create(name)
            wallets = cls.load_all()

        today = datetime.now().strftime("%Y-%m-%d")
        if wallets[name]["last_daily"] == today:
            return 0

        wallets[name]["coins"] += DAILY_BONUS
        wallets[name]["total_earned"] += DAILY_BONUS
        wallets[name]["last_daily"] = today
        cls.save_all(wallets)
        return DAILY_BONUS

    @classmethod
    def display_wallet(cls, name):
        w = cls.get_or_create(name)
        coins = w["coins"]

        print(f"\n{Color.muted('─' * 44)}")
        print(f"  {Color.BOLD}{Color.YELLOW}💰 Geldbörse: {name}{Color.RESET}")
        print(f"  {Color.muted('─' * 40)}")
        print(f"    Münzen:       {Color.BOLD}{Color.YELLOW}{coins}{Color.RESET} 🪙")
        print(f"    Gesamt verdient: {w['total_earned']}")
        print(f"    Gesamt verloren: {w['total_lost']}")

        if w["total_bets"] > 0:
            win_rate = (w["bets_won"] / w["total_bets"]) * 100
            print(f"    Wetten:       {w['total_bets']} ({win_rate:.0f}% gewonnen)")
            print(f"    Größter Gewinn: {Color.success(str(w['biggest_win']))}")
            print(f"    Größter Verlust: {Color.warning(str(w['biggest_loss']))}")

        print(f"{Color.muted('─' * 44)}")


class BettingSystem:
    @staticmethod
    def place_bet(name):
        wallet = Wallet.get_or_create(name)
        coins = wallet["coins"]

        if coins < 10:
            print(f"  {Color.warning('Nicht genug Münzen! Mindestens 10 benötigt.')}")
            print(f"  {Color.muted('Tipp: Hole dir den täglichen Bonus!')}")
            return None

        print(f"\n  {Color.BOLD}{Color.YELLOW}💰 WETT-BÜRO{Color.RESET}")
        print(f"  Dein Guthaben: {Color.BOLD}{coins}{Color.RESET} 🪙")
        print(f"\n  Wetteinsatz wählen:")
        print(f"    1) 10 Münzen  {Color.muted('(Klein)')}")
        print(f"    2) 50 Münzen  {Color.muted('(Mittel)')}")
        print(f"    3) 100 Münzen {Color.muted('(Groß)')}")
        print(f"    4) All-In! ({coins} Münzen) {Color.muted('(YOLO)')}")
        print(f"    5) Eigener Betrag")
        print(f"    0) Keine Wette")

        while True:
            choice = input("  Wahl (0-5): ").strip()
            if choice == "0":
                return None
            elif choice == "1":
                bet = 10
            elif choice == "2":
                bet = min(50, coins)
            elif choice == "3":
                bet = min(100, coins)
            elif choice == "4":
                bet = coins
            elif choice == "5":
                try:
                    bet = int(input(f"  Betrag (10-{coins}): ").strip())
                    if bet < 10 or bet > coins:
                        print(f"  Bitte 10-{coins} eingeben.")
                        continue
                except ValueError:
                    print("  Bitte eine Zahl eingeben.")
                    continue
            else:
                print("  Bitte 0-5 wählen.")
                continue

            if bet > coins:
                print(f"  {Color.warning('Nicht genug Münzen!')}")
                continue
            break

        print(f"\n  Risiko-Level:")
        for i, (key, mult) in enumerate(BET_MULTIPLIERS.items(), 1):
            mult_str = f"x{mult}"
            print(f"    {i}) {key.capitalize():<12} {Color.BOLD}{mult_str}{Color.RESET}")

        while True:
            rc = input("  Wahl (1-4): ").strip()
            if rc in ("1", "2", "3", "4"):
                risk_keys = list(BET_MULTIPLIERS.keys())
                risk = risk_keys[int(rc) - 1]
                multiplier = BET_MULTIPLIERS[risk]
                break
            print("  Bitte 1-4 wählen.")

        potential = int(bet * multiplier)
        print(f"\n  {Color.info('Wette platziert!')}")
        print(f"    Einsatz:        {bet} 🪙")
        print(f"    Risiko:         {risk.capitalize()}")
        print(f"    Multiplikator:  x{multiplier}")
        print(f"    Möglicher Gewinn: {Color.BOLD}{Color.GREEN}{potential} 🪙{Color.RESET}")

        return {"name": name, "bet": bet, "risk": risk, "multiplier": multiplier}

    @staticmethod
    def resolve_bet(bet_info, won):
        if bet_info is None:
            return

        name = bet_info["name"]
        bet = bet_info["bet"]
        multiplier = bet_info["multiplier"]
        wallets = Wallet.load_all()

        if name not in wallets:
            return

        wallets[name]["total_bets"] += 1

        if won:
            winnings = int(bet * multiplier)
            wallets[name]["coins"] += winnings
            wallets[name]["total_earned"] += winnings
            wallets[name]["bets_won"] += 1
            wallets[name]["biggest_win"] = max(wallets[name]["biggest_win"], winnings)
            Wallet.save_all(wallets)

            print(f"\n  {Color.BOLD}{Color.YELLOW}💰 WETTE GEWONNEN! 💰{Color.RESET}")
            print(f"    +{winnings} 🪙 verdient!")
            print(f"    Neues Guthaben: {Color.BOLD}{wallets[name]['coins']}{Color.RESET} 🪙")
        else:
            wallets[name]["coins"] = max(0, wallets[name]["coins"] - bet)
            wallets[name]["total_lost"] += bet
            wallets[name]["biggest_loss"] = max(wallets[name]["biggest_loss"], bet)
            Wallet.save_all(wallets)

            print(f"\n  {Color.warning('💸 Wette verloren!')}")
            print(f"    -{bet} 🪙")
            print(f"    Guthaben: {Color.BOLD}{wallets[name]['coins']}{Color.RESET} 🪙")

            if wallets[name]["coins"] == 0:
                print(f"  {Color.muted('Pleite! Hole dir morgen den täglichen Bonus.')}")


def display_richest():
    wallets = Wallet.load_all()
    if not wallets:
        print(f"  {Color.muted('Noch keine Spieler registriert.')}")
        return

    sorted_w = sorted(wallets.items(), key=lambda x: x[1]["coins"], reverse=True)

    print(f"\n{Color.muted('═' * 44)}")
    print(Color.title(f"{'REICHSTEN SPIELER':^44}"))
    print(f"{Color.muted('═' * 44)}")

    for i, (name, w) in enumerate(sorted_w[:10], 1):
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, "  ")
        coins = w["coins"]
        print(f"  {medal} {name:<20} {Color.BOLD}{Color.YELLOW}{coins:>6}{Color.RESET} 🪙")

    print(f"{Color.muted('═' * 44)}")


def betting_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART-KASINO':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Geldbörse anzeigen")
    print("    2) Täglichen Bonus abholen")
    print("    3) Reichsten Spieler")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            name = input("  Spielername: ").strip()
            if name:
                Wallet.display_wallet(name)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            name = input("  Spielername: ").strip()
            if name:
                bonus = Wallet.claim_daily(name)
                if bonus > 0:
                    print(f"  {Color.success(f'+{bonus} Münzen! Täglicher Bonus abgeholt!')}")
                    w = Wallet.get_or_create(name)
                    print(f"  Neues Guthaben: {Color.BOLD}{w['coins']}{Color.RESET} 🪙")
                else:
                    print(f"  {Color.muted('Du hast deinen Bonus heute schon abgeholt.')}")
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            display_richest()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
