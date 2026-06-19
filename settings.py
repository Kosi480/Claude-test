#!/usr/bin/env python3
"""Spieleinstellungen: Persistente Konfiguration."""

import json
import os
from dart_game import Color

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "game_settings.json")

DEFAULTS = {
    "default_score": 501,
    "default_skill": "standard",
    "commentary_enabled": True,
    "sounds_enabled": True,
    "show_dartboard": True,
    "show_animations": True,
    "show_checkout_hints": True,
    "throw_delay": 0.06,
    "player_name": "",
    "color_theme": "standard",
}

COLOR_THEMES = {
    "standard": {
        "name": "Standard",
        "desc": "Klassische Farben",
    },
    "neon": {
        "name": "Neon",
        "desc": "Leuchtende Farben",
    },
    "minimal": {
        "name": "Minimal",
        "desc": "Dezente Farben",
    },
}


class Settings:
    _instance = None

    @classmethod
    def instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.data = dict(DEFAULTS)
        self._load()

    def _load(self):
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, "r") as f:
                    saved = json.load(f)
                for key in DEFAULTS:
                    if key in saved:
                        self.data[key] = saved[key]
            except (json.JSONDecodeError, IOError):
                pass

    def save(self):
        with open(SETTINGS_FILE, "w") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def get(self, key, default=None):
        return self.data.get(key, default if default is not None else DEFAULTS.get(key))

    def set(self, key, value):
        self.data[key] = value
        self.save()

    def reset(self):
        self.data = dict(DEFAULTS)
        self.save()

    def display(self):
        print(f"\n{Color.muted('═' * 50)}")
        print(Color.title(f"{'EINSTELLUNGEN':^50}"))
        print(f"{Color.muted('═' * 50)}")

        score = self.get("default_score")
        skill = self.get("default_skill")

        from dart_game import SKILL_LEVELS
        skill_label = SKILL_LEVELS.get(skill, {}).get("label", skill)

        print(f"  Standard-Score:     {Color.BOLD}{score}{Color.RESET}")
        print(f"  Standard-Skill:     {Color.BOLD}{skill_label}{Color.RESET}")
        print(f"  Kommentare:         {'AN' if self.get('commentary_enabled') else 'AUS'}")
        print(f"  Sound-Effekte:      {'AN' if self.get('sounds_enabled') else 'AUS'}")
        print(f"  Dartboard anzeigen: {'AN' if self.get('show_dartboard') else 'AUS'}")
        print(f"  Animationen:        {'AN' if self.get('show_animations') else 'AUS'}")
        print(f"  Checkout-Hinweise:  {'AN' if self.get('show_checkout_hints') else 'AUS'}")

        theme = self.get("color_theme")
        theme_name = COLOR_THEMES.get(theme, {}).get("name", theme)
        print(f"  Farbschema:         {theme_name}")

        player = self.get("player_name")
        if player:
            print(f"  Standard-Name:      {Color.BOLD}{player}{Color.RESET}")

        print(f"{Color.muted('═' * 50)}")


def _toggle_setting(settings, key, label):
    current = settings.get(key)
    new_val = not current
    settings.set(key, new_val)
    status = "AN" if new_val else "AUS"
    print(f"  {label}: {Color.BOLD}{status}{Color.RESET}")


def settings_menu():
    settings = Settings.instance()

    print(Color.muted("=" * 50))
    print(Color.title(f"{'EINSTELLUNGEN':^50}"))
    print(Color.muted("=" * 50))

    while True:
        settings.display()

        print("\n  Was ändern?")
        print("    1) Standard-Score")
        print("    2) Standard-Skill")
        print("    3) Kommentare an/aus")
        print("    4) Sounds an/aus")
        print("    5) Dartboard an/aus")
        print("    6) Animationen an/aus")
        print("    7) Checkout-Hinweise an/aus")
        print("    8) Farbschema")
        print("    9) Standard-Name setzen")
        print("    r) Alles zurücksetzen")
        print("    0) Zurück")

        choice = input("\n  Wahl: ").strip().lower()

        if choice == "0":
            return
        elif choice == "1":
            print("\n  Standard-Score:")
            print("    1) 301")
            print("    2) 501")
            print("    3) 701")
            sc = input("  Wahl (1-3): ").strip()
            scores = {"1": 301, "2": 501, "3": 701}
            if sc in scores:
                settings.set("default_score", scores[sc])
                print(f"  Score: {Color.BOLD}{scores[sc]}{Color.RESET}")
        elif choice == "2":
            from dart_game import SKILL_ORDER, SKILL_LEVELS
            print("\n  Standard-Skill:")
            for i, key in enumerate(SKILL_ORDER, 1):
                print(f"    {i}) {SKILL_LEVELS[key]['label']}")
            sc = input("  Wahl (1-5): ").strip()
            if sc in "12345":
                skill = SKILL_ORDER[int(sc) - 1]
                settings.set("default_skill", skill)
                print(f"  Skill: {Color.BOLD}{SKILL_LEVELS[skill]['label']}{Color.RESET}")
        elif choice == "3":
            _toggle_setting(settings, "commentary_enabled", "Kommentare")
        elif choice == "4":
            _toggle_setting(settings, "sounds_enabled", "Sounds")
        elif choice == "5":
            _toggle_setting(settings, "show_dartboard", "Dartboard")
        elif choice == "6":
            _toggle_setting(settings, "show_animations", "Animationen")
        elif choice == "7":
            _toggle_setting(settings, "show_checkout_hints", "Checkout-Hinweise")
        elif choice == "8":
            print("\n  Farbschema:")
            for i, (key, info) in enumerate(COLOR_THEMES.items(), 1):
                print(f"    {i}) {info['name']} - {Color.muted(info['desc'])}")
            sc = input("  Wahl (1-3): ").strip()
            themes = list(COLOR_THEMES.keys())
            if sc in "123":
                settings.set("color_theme", themes[int(sc) - 1])
                print(f"  Schema: {Color.BOLD}{COLOR_THEMES[themes[int(sc) - 1]]['name']}{Color.RESET}")
        elif choice == "9":
            name = input("  Standard-Name: ").strip()
            if name:
                settings.set("player_name", name)
                print(f"  Name: {Color.BOLD}{name}{Color.RESET}")
        elif choice == "r":
            confirm = input("  Wirklich zurücksetzen? (j/n): ").strip().lower()
            if confirm == "j":
                settings.reset()
                print(Color.success("  Einstellungen zurückgesetzt!"))
