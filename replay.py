#!/usr/bin/env python3
"""Replay-System: Spiele aufzeichnen und abspielen."""

import json
import os
import time
from datetime import datetime
from dart_game import Color

REPLAY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "replays")


class ReplayRecorder:
    def __init__(self, player_names, game_mode, start_score):
        self.player_names = player_names
        self.game_mode = game_mode
        self.start_score = start_score
        self.events = []
        self.start_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        self.winner = None

    def record_throw(self, player_name, result, points, score_before, score_after):
        self.events.append({
            "type": "throw",
            "player": player_name,
            "result": result,
            "points": points,
            "score_before": score_before,
            "score_after": score_after,
        })

    def record_bust(self, player_name, result, points, score):
        self.events.append({
            "type": "bust",
            "player": player_name,
            "result": result,
            "points": points,
            "score": score,
        })

    def record_round_end(self, player_name, round_score, remaining):
        self.events.append({
            "type": "round_end",
            "player": player_name,
            "round_score": round_score,
            "remaining": remaining,
        })

    def record_win(self, player_name, total_darts):
        self.winner = player_name
        self.events.append({
            "type": "win",
            "player": player_name,
            "total_darts": total_darts,
        })

    def save(self):
        if not os.path.exists(REPLAY_DIR):
            os.makedirs(REPLAY_DIR)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        players_short = "_".join(n[:8] for n in self.player_names[:2])
        filename = f"replay_{timestamp}_{players_short}.json"
        filepath = os.path.join(REPLAY_DIR, filename)

        data = {
            "players": self.player_names,
            "game_mode": self.game_mode,
            "start_score": self.start_score,
            "start_time": self.start_time,
            "winner": self.winner,
            "events": self.events,
        }

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return filename


class ReplayPlayer:
    def __init__(self, filepath):
        try:
            with open(filepath, "r") as f:
                self.data = json.load(f)
        except (json.JSONDecodeError, IOError):
            self.data = {"players": [], "throws": [], "mode": "unknown", "scores": {}}

    def play(self, speed=1.0):
        d = self.data
        print(Color.muted("=" * 50))
        print(Color.title(f"{'REPLAY':^50}"))
        print(Color.muted("=" * 50))
        print(f"  Spieler:  {', '.join(d['players'])}")
        print(f"  Modus:    {d['start_score']} ({d['game_mode']})")
        print(f"  Datum:    {d['start_time']}")
        if d.get('winner'):
            print(f"  Gewinner: {Color.success(d['winner'])}")
        print(Color.muted("─" * 50))

        input(Color.info("\n  [Enter] zum Starten des Replays..."))

        scores = {name: d["start_score"] for name in d["players"]}
        current_player = None
        dart_in_round = 0

        for event in d["events"]:
            etype = event["type"]

            if etype == "throw":
                player = event["player"]
                if player != current_player:
                    current_player = player
                    dart_in_round = 0
                    print(f"\n  {Color.BOLD}--- {player} ---{Color.RESET}")

                dart_in_round += 1
                result = event["result"]
                points = event["points"]
                score_after = event["score_after"]
                scores[player] = score_after

                time.sleep(0.4 / speed)
                print(f"    Dart {dart_in_round}: {Color.colorize_result(result, points)} "
                      f"| Rest: {score_after}")

            elif etype == "bust":
                player = event["player"]
                result = event["result"]
                points = event["points"]
                time.sleep(0.3 / speed)
                print(f"    {Color.warning('BUST!')} {Color.colorize_result(result, points)}")

            elif etype == "round_end":
                player = event["player"]
                rs = event["round_score"]
                rem = event["remaining"]
                time.sleep(0.2 / speed)
                print(Color.muted(f"    Runden-Summe: {rs} | Verbleibend: {rem}"))

            elif etype == "win":
                player = event["player"]
                darts = event["total_darts"]
                time.sleep(0.5 / speed)
                print(f"\n  {Color.BOLD}{Color.YELLOW}{'*' * 44}")
                print(f"  {player} GEWINNT mit {darts} Darts!")
                print(f"  {'*' * 44}{Color.RESET}")

        print(Color.info("\n  Replay beendet."))


def list_replays():
    if not os.path.exists(REPLAY_DIR):
        return []
    files = [f for f in os.listdir(REPLAY_DIR) if f.endswith(".json")]
    files.sort(reverse=True)
    return files


def replay_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'REPLAYS':^50}"))
    print(Color.muted("=" * 50))

    replays = list_replays()

    if not replays:
        print("  Keine Replays vorhanden.")
        print("  Spiele werden automatisch aufgezeichnet.")
        input("\n  [Enter] zum Fortfahren...")
        return

    print(f"\n  {len(replays)} Replay(s) gefunden:\n")
    for i, filename in enumerate(replays[:10], 1):
        filepath = os.path.join(REPLAY_DIR, filename)
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            players = ", ".join(data["players"][:2])
            winner = data.get("winner", "?")
            score = data["start_score"]
            date = data.get("start_time", "?")
            print(f"    {i}) {date} | {score} | {players} | Sieger: {winner}")
        except (json.JSONDecodeError, KeyError):
            print(f"    {i}) {filename} (beschädigt)")

    print(f"    0) Zurück")

    while True:
        choice = input(f"\n  Replay wählen (0-{min(len(replays), 10)}): ").strip()
        if choice == "0":
            return
        try:
            idx = int(choice) - 1
            if 0 <= idx < min(len(replays), 10):
                filepath = os.path.join(REPLAY_DIR, replays[idx])

                print("\n  Abspielgeschwindigkeit:")
                print("    1) Normal (1x)")
                print("    2) Schnell (2x)")
                print("    3) Turbo (4x)")
                spd = input("  Wahl (1-3): ").strip()
                speed = {
                    "1": 1.0,
                    "2": 2.0,
                    "3": 4.0,
                }.get(spd, 1.0)

                player = ReplayPlayer(filepath)
                player.play(speed=speed)
                return
        except ValueError:
            pass
        print("  Ungültige Eingabe.")
