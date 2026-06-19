#!/usr/bin/env python3
"""Stats-Export: Karrieredaten als Textdatei exportieren."""

import os
import json
from datetime import datetime
from dart_game import Color

EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exports")


def ensure_export_dir():
    try:
        if not os.path.exists(EXPORT_DIR):
            os.makedirs(EXPORT_DIR)
    except (IOError, OSError):
        pass


def load_json(filename):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return None


def export_profile(player_name):
    lines = []
    lines.append("=" * 50)
    lines.append(f"  SPIELER-PROFIL: {player_name}")
    lines.append(f"  Exportiert: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("=" * 50)

    profiles = load_json("profiles.json")
    if profiles and player_name in profiles:
        p = profiles[player_name]
        lines.append(f"\n  Level:          {p.get('level', 1)}")
        lines.append(f"  Titel:          {p.get('title', '-')}")
        lines.append(f"  XP:             {p.get('xp', 0)}")
        lines.append(f"  Spiele:         {p.get('games_played', 0)}")
        lines.append(f"  Siege:          {p.get('wins', 0)}")
        lines.append(f"  Bester Avg:     {p.get('best_avg', 0):.1f}")
        lines.append(f"  180er:          {p.get('count_180', 0)}")
        lines.append(f"  Bullseyes:      {p.get('bullseyes', 0)}")

        achievements = p.get("achievements", [])
        if achievements:
            lines.append(f"\n  Achievements ({len(achievements)}):")
            for a in achievements:
                lines.append(f"    - {a}")
    else:
        lines.append("\n  Kein Profil gefunden.")

    return lines


def export_leaderboard():
    lines = []
    lines.append("\n" + "=" * 50)
    lines.append("  ELO-RANGLISTE")
    lines.append("=" * 50)

    lb = load_json("leaderboard.json")
    if lb:
        sorted_players = sorted(lb.items(), key=lambda x: -x[1].get("elo", 1000))
        lines.append(f"\n  {'#':>3}  {'Spieler':<16} {'Elo':>6} {'S':>4} {'N':>4} {'S%':>6}")
        lines.append(f"  {'-' * 44}")

        for i, (name, data) in enumerate(sorted_players, 1):
            elo = data.get("elo", 1000)
            wins = data.get("wins", 0)
            losses = data.get("losses", 0)
            total = wins + losses
            pct = (wins / total * 100) if total > 0 else 0
            lines.append(f"  {i:>3}  {name:<16} {elo:>6.0f} {wins:>4} {losses:>4} {pct:>5.1f}%")
    else:
        lines.append("\n  Keine Elo-Daten vorhanden.")

    return lines


def export_match_history(player_name=None):
    lines = []
    lines.append("\n" + "=" * 50)
    title = f"SPIELVERLAUF: {player_name}" if player_name else "SPIELVERLAUF (ALLE)"
    lines.append(f"  {title}")
    lines.append("=" * 50)

    history = load_json("match_history.json")
    if history:
        matches = history if isinstance(history, list) else history.get("matches", [])

        if player_name:
            matches = [
                m for m in matches
                if any(p.get("name") == player_name for p in m.get("players", []))
            ]

        if not matches:
            lines.append("\n  Keine Spiele gefunden.")
            return lines

        lines.append(f"\n  Insgesamt: {len(matches)} Spiele")
        lines.append(f"  {'-' * 44}")

        for m in matches[-20:]:
            date = m.get("date", "?")
            mode = m.get("match_type", "?")
            winner = m.get("winner_name", "?")
            players_str = " vs ".join(p.get("name", "?") for p in m.get("players", []))
            lines.append(f"\n  {date} | {mode}")
            lines.append(f"    {players_str}")
            lines.append(f"    Sieger: {winner}")

            for p in m.get("players", []):
                avg = p.get("avg_round", 0)
                darts = p.get("darts", 0)
                lines.append(f"      {p.get('name', '?')}: {darts} Darts, Ø {avg:.1f}")
    else:
        lines.append("\n  Keine Spielhistorie vorhanden.")

    return lines


def export_highscores():
    lines = []
    lines.append("\n" + "=" * 50)
    lines.append("  HIGHSCORES")
    lines.append("=" * 50)

    hs = load_json("highscores.json")
    if hs:
        entries = hs if isinstance(hs, list) else hs.get("entries", [])
        sorted_entries = sorted(entries, key=lambda x: x.get("darts", 999))

        lines.append(f"\n  {'#':>3}  {'Spieler':<16} {'Darts':>6} {'Avg':>8}")
        lines.append(f"  {'-' * 38}")

        for i, e in enumerate(sorted_entries[:20], 1):
            name = e.get("name", "?")
            darts = e.get("darts", 0)
            avg = e.get("avg", 0)
            lines.append(f"  {i:>3}  {name:<16} {darts:>6} {avg:>7.1f}")
    else:
        lines.append("\n  Keine Highscores vorhanden.")

    return lines


def export_heatmap_summary(player_name=None):
    lines = []
    lines.append("\n" + "=" * 50)
    title = f"HEATMAP: {player_name}" if player_name else "HEATMAP (GESAMT)"
    lines.append(f"  {title}")
    lines.append("=" * 50)

    hm = load_json("heatmap_data.json")
    if hm:
        data = hm.get(player_name, hm) if player_name else hm
        if isinstance(data, dict):
            segments = {}
            for ring in ("singles", "doubles", "triples"):
                ring_data = data.get(ring, {})
                for seg, count in ring_data.items():
                    segments[seg] = segments.get(seg, 0) + count
            if segments:
                sorted_segs = sorted(segments.items(), key=lambda x: -x[1])
                lines.append("\n  Meistgetroffene Segmente:")
                for seg, count in sorted_segs[:10]:
                    bar = "#" * min(count, 30)
                    lines.append(f"    {seg:>12}: {bar} ({count})")

            rings = {}
            for ring in ("singles", "doubles", "triples", "bull", "bullseye", "miss"):
                val = data.get(ring, 0)
                if isinstance(val, dict):
                    rings[ring] = sum(val.values())
                else:
                    rings[ring] = val
            if rings:
                lines.append("\n  Ring-Verteilung:")
                for ring, count in sorted(rings.items(), key=lambda x: -x[1]):
                    lines.append(f"    {ring:>12}: {count}")
    else:
        lines.append("\n  Keine Heatmap-Daten vorhanden.")

    return lines


def do_export(player_name=None, include_all=False):
    ensure_export_dir()

    all_lines = []
    all_lines.append("#" * 50)
    all_lines.append(f"  DART SPIEL - STATISTIK-EXPORT")
    all_lines.append(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    all_lines.append("#" * 50)

    if player_name:
        all_lines.extend(export_profile(player_name))
        all_lines.extend(export_match_history(player_name))
        all_lines.extend(export_heatmap_summary(player_name))

    if include_all or not player_name:
        all_lines.extend(export_leaderboard())
        all_lines.extend(export_highscores())
        if not player_name:
            all_lines.extend(export_match_history())
            all_lines.extend(export_heatmap_summary())

    all_lines.append("\n" + "#" * 50)
    all_lines.append("  Ende des Exports")
    all_lines.append("#" * 50)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if player_name:
        filename = f"export_{player_name}_{timestamp}.txt"
    else:
        filename = f"export_alle_{timestamp}.txt"

    filepath = os.path.join(EXPORT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(all_lines))

    return filepath


def export_menu():
    print(Color.muted("=" * 50))
    print(Color.title(f"{'STATISTIK-EXPORT':^50}"))
    print(Color.muted("=" * 50))

    print("\n  Export-Optionen:")
    print("    1) Spieler-Profil exportieren")
    print("    2) Alles exportieren (Rangliste, Highscores, History)")
    print("    3) Spieler-Komplett-Export (Profil + globale Stats)")
    print("    4) Zurück")

    while True:
        choice = input("  Wahl (1-4): ").strip()

        if choice == "4":
            return
        elif choice == "1":
            name = input("\n  Spielername: ").strip()
            if not name:
                print(Color.warning("  Kein Name angegeben."))
                continue
            filepath = do_export(player_name=name)
            print(f"\n  {Color.success('Export gespeichert!')}")
            print(f"  {Color.muted(filepath)}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "2":
            filepath = do_export()
            print(f"\n  {Color.success('Export gespeichert!')}")
            print(f"  {Color.muted(filepath)}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        elif choice == "3":
            name = input("\n  Spielername: ").strip()
            if not name:
                print(Color.warning("  Kein Name angegeben."))
                continue
            filepath = do_export(player_name=name, include_all=True)
            print(f"\n  {Color.success('Komplett-Export gespeichert!')}")
            print(f"  {Color.muted(filepath)}")
            input(Color.muted("\n  [Enter] zum Fortfahren..."))
            return
        print("  Bitte 1-4 wählen.")
