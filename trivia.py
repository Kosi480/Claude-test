#!/usr/bin/env python3
"""Dart-Trivia-Quiz mit Fragen über Dart-Geschichte, Regeln und Spieler."""

import random
import time
from dart_game import Color

TRIVIA_QUESTIONS = [
    {
        "q": "Wie heißt der innerste Ring auf dem Dartboard?",
        "options": ["Bullseye", "Bull", "Center", "Kern"],
        "answer": 0,
        "fact": "Das Bullseye (auch 'Double Bull') zählt 50 Punkte.",
    },
    {
        "q": "Wie viele Punkte ist eine maximale Runde (3 Darts) wert?",
        "options": ["150", "170", "180", "200"],
        "answer": 2,
        "fact": "180 = 3x Triple 20. Der Caller ruft: 'ONE HUNDRED AND EIGHTY!'",
    },
    {
        "q": "Aus welchem Land kommt der Dartsport ursprünglich?",
        "options": ["Deutschland", "USA", "England", "Niederlande"],
        "answer": 2,
        "fact": "Darts entstand im mittelalterlichen England als Kneipensport.",
    },
    {
        "q": "Wie viele Segmente hat ein Standard-Dartboard?",
        "options": ["18", "20", "22", "24"],
        "answer": 1,
        "fact": "20 nummerierte Segmente plus Bull und Bullseye.",
    },
    {
        "q": "Welche Zahl liegt auf dem Dartboard zwischen 20 und 18?",
        "options": ["5", "1", "12", "3"],
        "answer": 1,
        "fact": "Die 1 liegt zwischen 20 und 18 - absichtlich, um Fehlwürfe zu bestrafen.",
    },
    {
        "q": "Was ist ein 'Shanghai' im Darts?",
        "options": [
            "3x Bullseye in einer Runde",
            "Single, Double und Triple derselben Zahl",
            "3x Miss in Folge",
            "Ein perfektes Spiel",
        ],
        "answer": 1,
        "fact": "Shanghai: Single + Double + Triple der gleichen Zahl in einer Runde.",
    },
    {
        "q": "Wie weit ist die offizielle Abwurflinie (Oche) vom Board entfernt?",
        "options": ["2,00 m", "2,37 m", "2,50 m", "2,74 m"],
        "answer": 1,
        "fact": "2,37 Meter - festgelegt von der WDF und PDC.",
    },
    {
        "q": "In welcher Höhe hängt das Bullseye offiziell?",
        "options": ["1,53 m", "1,63 m", "1,73 m", "1,83 m"],
        "answer": 2,
        "fact": "1,73 Meter - gemessen vom Boden bis zur Mitte des Bullseye.",
    },
    {
        "q": "Was bedeutet 'Double Out'?",
        "options": [
            "Man muss zwei Spiele gewinnen",
            "Der letzte Dart muss ein Double sein",
            "Man wirft mit zwei Darts gleichzeitig",
            "Zwei Spieler werfen gleichzeitig",
        ],
        "answer": 1,
        "fact": "Bei professionellen Turnieren muss das Spiel immer mit einem Double beendet werden.",
    },
    {
        "q": "Wer gilt als einer der erfolgreichsten Dartspieler aller Zeiten?",
        "options": ["Michael van Gerwen", "Phil Taylor", "Gary Anderson", "Eric Bristow"],
        "answer": 1,
        "fact": "Phil 'The Power' Taylor gewann 16 WM-Titel - ein unerreichter Rekord.",
    },
    {
        "q": "Was ist ein '9-Darter'?",
        "options": [
            "9 Bullseyes in Folge",
            "Ein Spiel mit nur 9 Darts (501 in 3 Runden)",
            "9 Triples in Folge",
            "Ein Spiel das 9 Runden dauert",
        ],
        "answer": 1,
        "fact": "Der perfekte 9-Darter: z.B. 7x T20, T19, D12. Äußerst selten!",
    },
    {
        "q": "Was ist der höchste mögliche Checkout (Finish) im 501?",
        "options": ["160", "167", "170", "180"],
        "answer": 2,
        "fact": "170 = T20, T20, Bullseye. Das höchste mögliche Finish.",
    },
    {
        "q": "Woraus bestehen traditionelle Dartpfeile?",
        "options": ["Holz", "Messing (Brass)", "Wolfram (Tungsten)", "Alle genannten"],
        "answer": 3,
        "fact": "Früher Holz, dann Messing, heute bevorzugen Profis Wolfram (Tungsten).",
    },
    {
        "q": "Was bedeutet 'Bust' beim Darts?",
        "options": [
            "Ein kaputter Pfeil",
            "Überworfen - Score geht auf den Stand vor der Runde zurück",
            "Drei Misses in Folge",
            "Das Board fällt von der Wand",
        ],
        "answer": 1,
        "fact": "Bei Bust wird der Score auf den Stand vor der Runde zurückgesetzt.",
    },
    {
        "q": "Welche Organisation veranstaltet die bekannteste Dart-WM?",
        "options": ["WDF", "BDO", "PDC", "DDV"],
        "answer": 2,
        "fact": "Die PDC (Professional Darts Corporation) WM im Ally Pally ist das größte Event.",
    },
    {
        "q": "Was ist der 'Ally Pally'?",
        "options": [
            "Ein berühmter Dartspieler",
            "Ein Dart-Hersteller",
            "Der Alexandra Palace in London",
            "Eine Dart-Technik",
        ],
        "answer": 2,
        "fact": "Der Alexandra Palace in London ist seit 2007 Austragungsort der PDC-WM.",
    },
    {
        "q": "Wie viele Darts wirft man maximal pro Runde?",
        "options": ["2", "3", "4", "5"],
        "answer": 1,
        "fact": "3 Darts pro Runde (Aufnahme) - es sei denn, man checkt vorher aus.",
    },
    {
        "q": "Was zählt der äußere schmale Ring (Double-Ring)?",
        "options": [
            "Einfacher Wert",
            "Doppelter Wert",
            "Dreifacher Wert",
            "Kein Wert",
        ],
        "answer": 1,
        "fact": "Der äußere schmale Ring verdoppelt den Segmentwert.",
    },
    {
        "q": "Welcher Spitzname gehört NICHT zu einem echten Dartspieler?",
        "options": ["The Power", "Barney", "The Hammer", "Lightning Larry"],
        "answer": 3,
        "fact": "Phil Taylor = The Power, Raymond van Barneveld = Barney, Andy Hamilton = The Hammer.",
    },
    {
        "q": "Was ist ein 'Ton' im Darts-Jargon?",
        "options": [
            "Ein lauter Aufprall",
            "100 Punkte in einer Runde",
            "Ein besonders schwerer Pfeil",
            "Einen Gegner besiegen",
        ],
        "answer": 1,
        "fact": "'Ton' kommt vom englischen 'ton' (= 100). Ton-Eighty = 180.",
    },
]


def run_trivia(num_questions=10):
    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'DART-TRIVIA-QUIZ':^50}"))
    print(f"{Color.muted('═' * 50)}")
    print(f"  {Color.info(f'{num_questions} Fragen rund um den Dartsport!')}")
    print(f"  {Color.muted('Beantworte so viele wie möglich richtig.')}")

    input(Color.info("\n  [Enter] zum Starten..."))

    questions = random.sample(TRIVIA_QUESTIONS, min(num_questions, len(TRIVIA_QUESTIONS)))
    score = 0
    streak = 0
    best_streak = 0

    for i, q in enumerate(questions, 1):
        print(f"\n{Color.BOLD}{Color.CYAN}  Frage {i}/{len(questions)}{Color.RESET}")
        print(f"  {Color.muted('─' * 46)}")
        print(f"  {q['q']}")
        print()

        shuffled_indices = list(range(len(q["options"])))
        random.shuffle(shuffled_indices)
        correct_new_idx = shuffled_indices.index(q["answer"])

        for j, idx in enumerate(shuffled_indices):
            print(f"    {j + 1}) {q['options'][idx]}")

        while True:
            try:
                answer = int(input(f"\n  Deine Antwort (1-{len(q['options'])}): ").strip())
                if 1 <= answer <= len(q["options"]):
                    break
                print(f"  Bitte 1-{len(q['options'])} wählen.")
            except ValueError:
                print("  Bitte eine Zahl eingeben.")

        if answer - 1 == correct_new_idx:
            score += 1
            streak += 1
            best_streak = max(best_streak, streak)
            print(f"  {Color.success('✓ RICHTIG!')}")
            if streak >= 3:
                print(f"  {Color.YELLOW}🔥 {streak}er Serie!{Color.RESET}")
        else:
            streak = 0
            correct_text = q["options"][q["answer"]]
            print(f"  {Color.warning('✗ FALSCH!')} Richtig wäre: {Color.BOLD}{correct_text}{Color.RESET}")

        fact = q["fact"]
        print(f"  {Color.muted(f'💡 {fact}')}")

    print(f"\n{Color.muted('═' * 50)}")
    print(Color.title(f"{'QUIZ-ERGEBNIS':^50}"))
    print(f"{Color.muted('═' * 50)}")

    pct = (score / len(questions)) * 100 if questions else 0
    print(f"  Punkte:       {Color.BOLD}{score}/{len(questions)}{Color.RESET} ({pct:.0f}%)")
    print(f"  Beste Serie:  {Color.YELLOW}{best_streak}{Color.RESET}")

    if pct == 100:
        print(f"\n  {Color.BOLD}{Color.YELLOW}🏆 PERFEKT! Du bist ein wahrer Dart-Experte!{Color.RESET}")
    elif pct >= 80:
        print(f"\n  {Color.success('🎯 Ausgezeichnet! Du kennst dich gut aus!')}")
    elif pct >= 60:
        print(f"\n  {Color.info('👍 Gut! Du weißt einiges über Darts!')}")
    elif pct >= 40:
        print(f"\n  {Color.muted('📚 Nicht schlecht, aber da geht noch was!')}")
    else:
        print(f"\n  {Color.muted('📖 Zeit, mehr über Darts zu lernen!')}")


def trivia_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'DART-TRIVIA':^50}"))
    print(Color.muted("=" * 50))

    print("\n    1) Schnelles Quiz (5 Fragen)")
    print("    2) Standard-Quiz (10 Fragen)")
    print("    3) Marathon-Quiz (alle Fragen)")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()
        if choice == "1":
            run_trivia(5)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "2":
            run_trivia(10)
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "3":
            run_trivia(len(TRIVIA_QUESTIONS))
            input("\n  [Enter] zum Fortfahren...")
            return
        elif choice == "4":
            return
        print("  Bitte 1-4 wählen.")
