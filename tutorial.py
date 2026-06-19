#!/usr/bin/env python3
"""Tutorial-System und Tipps für Dart-Neulinge."""

import random
from dart_game import Color

BASIC_TUTORIAL = [
    {
        "title": "Willkommen beim Darts!",
        "text": [
            "Beim Darts wirft man kleine Pfeile auf eine runde Scheibe.",
            "Ziel ist es, von einem Startscore (z.B. 501) auf genau 0 zu kommen.",
            "Pro Runde wirfst du 3 Darts.",
        ],
    },
    {
        "title": "Das Dartboard",
        "text": [
            "Das Board hat 20 nummerierte Segmente (1-20).",
            "Jedes Segment hat verschiedene Bereiche:",
            "  Single  - der breite Bereich (1x Wert)",
            "  Double  - der äußere schmale Ring (2x Wert)",
            "  Triple  - der innere schmale Ring (3x Wert)",
            "  Bull    - der äußere Kreis in der Mitte (25 Punkte)",
            "  Bullseye - der innere Kreis (50 Punkte)",
        ],
    },
    {
        "title": "Punkte zählen",
        "text": [
            "Dein Score startet z.B. bei 501.",
            "Jeder Treffer wird von deinem Score abgezogen.",
            "Beispiel: Score 501, du wirfst Triple 20 (60).",
            "          Neuer Score: 441.",
            "",
            "Das höchste mit 3 Darts: 180 (3x Triple 20).",
        ],
    },
    {
        "title": "Bust-Regel",
        "text": [
            "Wirfst du MEHR als deinen verbleibenden Score,",
            "ist die Runde ungültig - 'BUST'!",
            "Dein Score geht auf den Stand VOR der Runde zurück.",
            "",
            "Beispiel: Score 40, du wirfst Triple 20 (60).",
            "          BUST! Score bleibt bei 40.",
        ],
    },
    {
        "title": "Checkout / Finish",
        "text": [
            "Um zu gewinnen, musst du EXAKT auf 0 kommen.",
            "Bei Profis: Der letzte Dart muss ein Double sein.",
            "",
            "Beispiel-Checkouts:",
            "  40 = D20",
            "  50 = Bullseye (D25)",
            "  170 = T20, T20, Bullseye (höchstes Finish!)",
        ],
    },
    {
        "title": "Spielmodi",
        "text": [
            "501 - Standard-Modus (am beliebtesten)",
            "301 - Kurzes Spiel (schneller, weniger Fehler erlaubt)",
            "701 - Langes Spiel (mehr Strategie, mehr Darts)",
            "",
            "Cricket - Jage die Zahlen 15-20 und Bull!",
            "Killer  - Taktisches Eliminierungsspiel",
            "Shanghai - Triff Single, Double UND Triple!",
        ],
    },
]

STRATEGY_TIPS = [
    {
        "title": "Triple 20 vs Triple 19",
        "tip": "Profis zielen auf Triple 20 (60 Punkte). Aber Triple 19 (57) "
               "ist fast genauso gut und hat günstigere Nachbarsegmente.",
    },
    {
        "title": "Checkout-Strategie",
        "tip": "Unter 170 Punkten: Denke an deinen Checkout-Weg! "
               "Versuche, auf ein gerades Restguthaben zu kommen, "
               "das mit einem Double erreichbar ist.",
    },
    {
        "title": "Favoriten-Doubles",
        "tip": "Die beliebtesten Checkout-Doubles: D20 (40), D16 (32), D10 (20). "
               "Wähle ein 'Lieblings-Double' und übe es regelmäßig!",
    },
    {
        "title": "Drei-Dart-Rhythmus",
        "tip": "Finde deinen Rhythmus: Ziel anvisieren, kurze Pause, werfen. "
               "Nicht zu lange zielen - das führt zu Verkrampfung.",
    },
    {
        "title": "Bogey-Zahlen vermeiden",
        "tip": "159, 162, 163, 165, 166, 168, 169 können nicht in 3 Darts "
               "gecheckt werden. Plane deine Runden, um diese zu vermeiden!",
    },
    {
        "title": "Scoring vs Finishing",
        "tip": "Beim Scoring (hohes Restguthaben): Wirf auf Triple 20/19. "
               "Beim Finishing (unter 170): Wechsle in den Checkout-Modus.",
    },
    {
        "title": "Cover-Shots",
        "tip": "Wenn du D20 verfehlst und den Single 20 triffst, "
               "bleibt dir D10 als Backup. Plane immer 'Plan B'-Doubles!",
    },
    {
        "title": "Ton-80 Strategie",
        "tip": "Für 180: Alle 3 Darts auf Triple 20. "
               "Tipp: Platziere den ersten Dart und nutze ihn als 'Zielmarke'.",
    },
    {
        "title": "Nervenstärke",
        "tip": "Beim Checkout: Atme ruhig, konzentriere dich auf den Punkt. "
               "Denke nicht an 'Ich muss treffen', sondern 'Ich werfe dort hin'.",
    },
    {
        "title": "Übung macht den Meister",
        "tip": "Nutze den Trainings-Modus! 'Around the Clock' verbessert die "
               "Genauigkeit, 'Double Out Practice' trainiert das Finishing.",
    },
]

QUICK_TIPS = [
    "Triple 20 = 60 Punkte - das Maximum pro Dart!",
    "180 = 3x Triple 20 - die perfekte Runde!",
    "D16 ist das beliebteste Double bei den Profis.",
    "170 (T20, T20, Bull) ist das höchste Checkout.",
    "Niemals auf die 1 zielen - die Nachbarn sind 20 und 18!",
    "Cricket-Tipp: Schließe die 20 zuerst!",
    "Phil Taylor gewann 16 WM-Titel - ein Rekord!",
    "Der 9-Darter ist das perfekte Spiel: 501 in nur 9 Darts.",
    "Bullseye (D25) = 50 Punkte, das zweitbeste pro Dart.",
    "Bust passiert jedem - bleibe ruhig und mach weiter!",
    "Übrigens: Die Dartscheibe wurde 1896 von Brian Gamlin erfunden.",
    "Tipp: Nutze den Checkout-Rechner (Menü: r)!",
]


def run_tutorial():
    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'DART-TUTORIAL':^56}"))
    print(f"{Color.muted('═' * 56)}")
    print(f"  {Color.info('Lerne die Grundlagen des Dartsports!')}")

    for i, section in enumerate(BASIC_TUTORIAL, 1):
        print(f"\n  {Color.BOLD}{Color.CYAN}Lektion {i}/{len(BASIC_TUTORIAL)}: "
              f"{section['title']}{Color.RESET}")
        print(f"  {Color.muted('─' * 50)}")
        for line in section["text"]:
            print(f"  {line}")

        if i < len(BASIC_TUTORIAL):
            input(f"\n  {Color.muted('[Enter] für nächste Lektion...')}")

    print(f"\n{Color.success('Tutorial abgeschlossen! Du bist bereit fürs Spiel!')}")
    input(f"\n  {Color.muted('[Enter] zum Fortfahren...')}")


def show_strategy_tips(count=3):
    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'STRATEGIE-TIPPS':^56}"))
    print(f"{Color.muted('═' * 56)}")

    selected = random.sample(STRATEGY_TIPS, min(count, len(STRATEGY_TIPS)))

    for i, tip in enumerate(selected, 1):
        print(f"\n  {Color.BOLD}{Color.YELLOW}💡 Tipp {i}: {tip['title']}{Color.RESET}")
        print(f"  {tip['tip']}")

    print(f"\n{Color.muted('═' * 56)}")


def show_random_tip():
    tip = random.choice(QUICK_TIPS)
    print(f"  {Color.DIM}💡 {tip}{Color.RESET}")


def show_glossary():
    terms = [
        ("180", "Drei Triple 20 in einer Runde - die maximale Punktzahl"),
        ("9-Darter", "Ein 501-Spiel in nur 9 Darts (3 Runden) beenden"),
        ("Bust", "Überworfen - Score wird zurückgesetzt"),
        ("Bullseye", "Der innere Kreis der Mitte (50 Punkte, = D25)"),
        ("Bull", "Der äußere Kreis der Mitte (25 Punkte, = S25)"),
        ("Checkout", "Die letzten Würfe zum Gewinnen (Finish)"),
        ("Cricket", "Spielmodus mit den Zahlen 15-20 + Bull"),
        ("Double", "Der äußere schmale Ring (2x Segmentwert)"),
        ("Double Out", "Das Spiel muss mit einem Double beendet werden"),
        ("Leg", "Ein einzelnes Spiel (z.B. ein 501-Durchgang)"),
        ("Oche", "Die Abwurflinie (2,37m vom Board)"),
        ("Set", "Eine Serie von Legs"),
        ("Shanghai", "Single + Double + Triple der gleichen Zahl in einer Runde"),
        ("Ton", "100 Punkte in einer Runde"),
        ("Ton-80", "Eine 180 (maximale Runde)"),
        ("Triple", "Der innere schmale Ring (3x Segmentwert)"),
    ]

    print(f"\n{Color.muted('═' * 56)}")
    print(Color.title(f"{'DART-GLOSSAR':^56}"))
    print(f"{Color.muted('═' * 56)}")

    for term, definition in terms:
        print(f"  {Color.BOLD}{Color.CYAN}{term:<14}{Color.RESET} {definition}")

    print(f"{Color.muted('═' * 56)}")


def tutorial_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'HILFE & TUTORIAL':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Grundlagen-Tutorial")
    print("    2) Strategie-Tipps")
    print("    3) Dart-Glossar")
    print("    4) Zufälliger Tipp")
    print("    5) Zurück")

    while True:
        choice = input("  Wahl (1-5): ").strip()
        if choice == "1":
            run_tutorial()
            return
        elif choice == "2":
            show_strategy_tips()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            show_glossary()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            show_random_tip()
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "5":
            return
        print("  Bitte 1-5 wählen.")
