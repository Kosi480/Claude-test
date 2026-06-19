#!/usr/bin/env python3
"""Spieler-Profile mit XP, Level und Achievements."""

import json
import os
from datetime import datetime

PROFILES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "profiles.json")

LEVEL_TITLES = {
    1: "Anfänger",
    2: "Hobbyspieler",
    3: "Kneipenspieler",
    4: "Vereinsspieler",
    5: "Turnierspieler",
    6: "Regionaler Profi",
    7: "Nationaler Profi",
    8: "Internationaler Profi",
    9: "Weltklasse",
    10: "Legende",
}

ACHIEVEMENTS = {
    "first_win": ("Erster Sieg", "Gewinne dein erstes Spiel"),
    "bullseye_king": ("Bullseye-König", "Wirf 10 Bullseyes insgesamt"),
    "triple_master": ("Triple-Meister", "Wirf 50 Triples insgesamt"),
    "no_bust": ("Fehlerfrei", "Gewinne ein Spiel ohne Bust"),
    "speedster": ("Blitzwerfer", "Gewinne mit weniger als 30 Darts"),
    "marathon": ("Marathonläufer", "Spiele 50 Runden insgesamt"),
    "high_scorer": ("Punktesammler", "Erziele eine 180er Runde (3x Triple 20)"),
    "cpu_slayer": ("KI-Bezwinger", "Schlage einen schweren KI-Gegner"),
    "tournament_champ": ("Turnier-Champion", "Gewinne ein Best-of-7 Turnier"),
    "centurion": ("Zenturio", "Wirf 100+ Punkte in einer Runde"),
}


def xp_for_level(level):
    return int(100 * (1.5 ** (level - 1)))


class PlayerProfile:
    def __init__(self, name):
        self.name = name
        self.xp = 0
        self.level = 1
        self.total_games = 0
        self.total_wins = 0
        self.total_darts = 0
        self.total_bullseyes = 0
        self.total_triples = 0
        self.total_rounds = 0
        self.achievements = []
        self.created = datetime.now().strftime("%Y-%m-%d")
        self.last_played = datetime.now().strftime("%Y-%m-%d")

    def add_xp(self, amount):
        self.xp += amount
        leveled_up = False
        while self.xp >= xp_for_level(self.level) and self.level < 10:
            self.xp -= xp_for_level(self.level)
            self.level += 1
            leveled_up = True
        return leveled_up

    def unlock_achievement(self, key):
        if key not in self.achievements and key in ACHIEVEMENTS:
            self.achievements.append(key)
            return ACHIEVEMENTS[key]
        return None

    def check_achievements(self, game_stats=None, won=False, busts=0, darts=0, vs_hard_cpu=False, tournament_bo7=False):
        unlocked = []
        if won and "first_win" not in self.achievements:
            r = self.unlock_achievement("first_win")
            if r:
                unlocked.append(r)

        if self.total_bullseyes >= 10 and "bullseye_king" not in self.achievements:
            r = self.unlock_achievement("bullseye_king")
            if r:
                unlocked.append(r)

        if self.total_triples >= 50 and "triple_master" not in self.achievements:
            r = self.unlock_achievement("triple_master")
            if r:
                unlocked.append(r)

        if won and busts == 0 and "no_bust" not in self.achievements:
            r = self.unlock_achievement("no_bust")
            if r:
                unlocked.append(r)

        if won and darts < 30 and "speedster" not in self.achievements:
            r = self.unlock_achievement("speedster")
            if r:
                unlocked.append(r)

        if self.total_rounds >= 50 and "marathon" not in self.achievements:
            r = self.unlock_achievement("marathon")
            if r:
                unlocked.append(r)

        if game_stats and game_stats.highest_round >= 180 and "high_scorer" not in self.achievements:
            r = self.unlock_achievement("high_scorer")
            if r:
                unlocked.append(r)

        if game_stats and game_stats.highest_round >= 100 and "centurion" not in self.achievements:
            r = self.unlock_achievement("centurion")
            if r:
                unlocked.append(r)

        if won and vs_hard_cpu and "cpu_slayer" not in self.achievements:
            r = self.unlock_achievement("cpu_slayer")
            if r:
                unlocked.append(r)

        if won and tournament_bo7 and "tournament_champ" not in self.achievements:
            r = self.unlock_achievement("tournament_champ")
            if r:
                unlocked.append(r)

        return unlocked

    @property
    def title(self):
        return LEVEL_TITLES.get(self.level, "Unbekannt")

    @property
    def xp_progress(self):
        needed = xp_for_level(self.level)
        pct = min(self.xp / needed, 1.0) if needed > 0 else 1.0
        bar_len = 20
        filled = int(pct * bar_len)
        return f"[{'█' * filled}{'░' * (bar_len - filled)}] {self.xp}/{needed} XP"

    @property
    def win_rate(self):
        if self.total_games == 0:
            return 0.0
        return (self.total_wins / self.total_games) * 100

    def to_dict(self):
        return {
            "name": self.name,
            "xp": self.xp,
            "level": self.level,
            "total_games": self.total_games,
            "total_wins": self.total_wins,
            "total_darts": self.total_darts,
            "total_bullseyes": self.total_bullseyes,
            "total_triples": self.total_triples,
            "total_rounds": self.total_rounds,
            "achievements": self.achievements,
            "created": self.created,
            "last_played": self.last_played,
        }

    @classmethod
    def from_dict(cls, data):
        p = cls(data["name"])
        p.xp = data.get("xp", 0)
        p.level = data.get("level", 1)
        p.total_games = data.get("total_games", 0)
        p.total_wins = data.get("total_wins", 0)
        p.total_darts = data.get("total_darts", 0)
        p.total_bullseyes = data.get("total_bullseyes", 0)
        p.total_triples = data.get("total_triples", 0)
        p.total_rounds = data.get("total_rounds", 0)
        p.achievements = data.get("achievements", [])
        p.created = data.get("created", "")
        p.last_played = data.get("last_played", "")
        return p


class ProfileManager:
    @staticmethod
    def load_all():
        if os.path.exists(PROFILES_FILE):
            with open(PROFILES_FILE, "r") as f:
                data = json.load(f)
            return {name: PlayerProfile.from_dict(d) for name, d in data.items()}
        return {}

    @staticmethod
    def save_all(profiles):
        data = {name: p.to_dict() for name, p in profiles.items()}
        with open(PROFILES_FILE, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @classmethod
    def get_or_create(cls, name):
        profiles = cls.load_all()
        if name not in profiles:
            profiles[name] = PlayerProfile(name)
            cls.save_all(profiles)
        return profiles[name]

    @classmethod
    def update_after_game(cls, name, stats, won=False, busts=0, darts=0,
                          vs_hard_cpu=False, tournament_bo7=False):
        profiles = cls.load_all()
        if name not in profiles:
            profiles[name] = PlayerProfile(name)

        p = profiles[name]
        p.total_games += 1
        p.total_darts += darts
        p.total_bullseyes += stats.bullseyes
        p.total_triples += stats.triples
        p.total_rounds += len(stats.round_scores)
        p.last_played = datetime.now().strftime("%Y-%m-%d")

        xp_earned = 10
        if won:
            p.total_wins += 1
            xp_earned += 50
        xp_earned += stats.bullseyes * 5
        xp_earned += stats.triples * 2
        if stats.highest_round >= 100:
            xp_earned += 20
        if stats.highest_round >= 180:
            xp_earned += 50

        leveled_up = p.add_xp(xp_earned)
        unlocked = p.check_achievements(stats, won, busts, darts, vs_hard_cpu, tournament_bo7)

        cls.save_all(profiles)
        return p, xp_earned, leveled_up, unlocked

    @classmethod
    def display_profile(cls, name):
        from dart_game import Color
        profiles = cls.load_all()
        if name not in profiles:
            print(f"  Profil '{name}' nicht gefunden.")
            return

        p = profiles[name]
        print(f"\n{'═' * 44}")
        print(f"{Color.BOLD}{Color.YELLOW}  SPIELER-PROFIL: {p.name}{Color.RESET}")
        print(f"{'═' * 44}")
        print(f"  Level:        {Color.BOLD}{p.level}{Color.RESET} - {Color.info(p.title)}")
        print(f"  XP:           {p.xp_progress}")
        print(f"  Spiele:       {p.total_games} ({p.total_wins} Siege, {p.win_rate:.0f}%)")
        print(f"  Geworfene:    {p.total_darts} Darts")
        print(f"  Bullseyes:    {p.total_bullseyes}")
        print(f"  Triples:      {p.total_triples}")
        print(f"  Dabei seit:   {p.created}")
        print(f"  Zuletzt:      {p.last_played}")

        if p.achievements:
            print(f"\n  {Color.title('Achievements:')}")
            for key in p.achievements:
                if key in ACHIEVEMENTS:
                    title, desc = ACHIEVEMENTS[key]
                    print(f"    {Color.BOLD}{Color.GREEN}★{Color.RESET} {title} - {Color.muted(desc)}")

        remaining = [k for k in ACHIEVEMENTS if k not in p.achievements]
        if remaining:
            print(f"\n  {Color.muted('Noch nicht freigeschaltet:')}")
            for key in remaining[:3]:
                title, desc = ACHIEVEMENTS[key]
                print(f"    {Color.muted(f'☆ {title} - {desc}')}")
            if len(remaining) > 3:
                print(f"    {Color.muted(f'  ... und {len(remaining) - 3} weitere')}")

        print(f"{'═' * 44}")
