#!/usr/bin/env python3
"""Dart Game GUI: Visuelles Interface mit tkinter."""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import math
import random
import threading
import time
from training import parse_hit_number

SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

COLORS = {
    "bg": "#1a1a2e",
    "fg": "#e0e0e0",
    "accent": "#e94560",
    "accent2": "#0f3460",
    "green": "#16c79a",
    "red": "#e94560",
    "yellow": "#f5c518",
    "dark": "#0f0f23",
    "card": "#16213e",
    "card_hover": "#1a3a5c",
    "white": "#ffffff",
    "muted": "#666680",
    "board_black": "#1a1a1a",
    "board_red": "#cc2222",
    "board_green": "#22aa22",
    "board_cream": "#f5e6c8",
    "bull_green": "#22aa22",
    "bull_red": "#cc2222",
    "panel": "#16213e",
    "text": "#e0e0e0",
    "text_dim": "#666680",
}


class DartBoardCanvas:
    def __init__(self, parent, size=400, on_throw=None):
        self.size = size
        self.center = size // 2
        self.on_throw = on_throw
        self.canvas = tk.Canvas(parent, width=size, height=size, bg=COLORS["dark"],
                                highlightthickness=0)
        self.dart_marker = None
        self.draw_board()
        self.canvas.bind("<Button-1>", self._on_click)

    def draw_board(self):
        cx, cy = self.center, self.center
        scale = self.size / 2 * 0.9

        radii = {
            "double_out": 1.0,
            "double_in": 0.92,
            "triple_out": 0.60,
            "triple_in": 0.55,
            "outer_bull": 0.18,
            "inner_bull": 0.07,
        }

        for i, seg in enumerate(SEGMENTS):
            angle_start = -9 + i * 18
            angle_extent = 18

            color_outer = COLORS["board_red"] if i % 2 == 0 else COLORS["board_green"]
            color_inner = COLORS["board_cream"] if i % 2 == 0 else COLORS["board_black"]

            r1 = radii["double_in"] * scale
            r2 = radii["double_out"] * scale
            self._draw_ring_segment(cx, cy, r1, r2, angle_start, angle_extent, color_outer)

            r1 = radii["triple_out"] * scale
            r2 = radii["double_in"] * scale
            self._draw_ring_segment(cx, cy, r1, r2, angle_start, angle_extent, color_inner)

            r1 = radii["triple_in"] * scale
            r2 = radii["triple_out"] * scale
            self._draw_ring_segment(cx, cy, r1, r2, angle_start, angle_extent, color_outer)

            r1 = radii["outer_bull"] * scale
            r2 = radii["triple_in"] * scale
            self._draw_ring_segment(cx, cy, r1, r2, angle_start, angle_extent, color_inner)

        r_ob = radii["outer_bull"] * scale
        self.canvas.create_oval(cx - r_ob, cy - r_ob, cx + r_ob, cy + r_ob,
                                fill=COLORS["bull_green"], outline="#333")

        r_ib = radii["inner_bull"] * scale
        self.canvas.create_oval(cx - r_ib, cy - r_ib, cx + r_ib, cy + r_ib,
                                fill=COLORS["bull_red"], outline="#333")

        num_radius = scale * 1.05
        for i, seg in enumerate(SEGMENTS):
            angle = math.radians(90 - (i * 18))
            nx = cx + num_radius * math.cos(angle)
            ny = cy - num_radius * math.sin(angle)
            self.canvas.create_text(nx, ny, text=str(seg), fill=COLORS["white"],
                                    font=("Arial", 9, "bold"))

    def _draw_ring_segment(self, cx, cy, r_inner, r_outer, angle_start, angle_extent, color):
        points = []
        steps = 20
        for i in range(steps + 1):
            a = math.radians(angle_start + angle_extent * i / steps)
            points.append(cx + r_outer * math.cos(a))
            points.append(cy - r_outer * math.sin(a))
        for i in range(steps, -1, -1):
            a = math.radians(angle_start + angle_extent * i / steps)
            points.append(cx + r_inner * math.cos(a))
            points.append(cy - r_inner * math.sin(a))
        self.canvas.create_polygon(points, fill=color, outline="#333333", width=1)

    def _on_click(self, event):
        dx = event.x - self.center
        dy = -(event.y - self.center)
        distance = math.sqrt(dx * dx + dy * dy)
        scale = self.size / 2 * 0.9

        angle = math.degrees(math.atan2(dy, dx))
        if angle < 0:
            angle += 360

        self.show_dart(event.x, event.y)

        result, points = self._calc_hit(distance, angle, scale)

        if self.on_throw:
            self.on_throw(result, points)

    def _calc_hit(self, distance, angle, scale):
        radii = {
            "double_out": 1.0 * scale,
            "double_in": 0.92 * scale,
            "triple_out": 0.60 * scale,
            "triple_in": 0.55 * scale,
            "outer_bull": 0.18 * scale,
            "inner_bull": 0.07 * scale,
        }

        if distance > radii["double_out"]:
            return "Miss", 0

        if distance <= radii["inner_bull"]:
            return "Bullseye", 50

        if distance <= radii["outer_bull"]:
            return "Bull", 25

        seg_angle = (90 - angle) % 360
        if seg_angle < 0:
            seg_angle += 360
        idx = int((seg_angle + 9) / 18) % 20
        segment = SEGMENTS[idx]

        if distance > radii["double_in"]:
            return f"Double {segment}", segment * 2
        elif distance > radii["triple_out"]:
            return f"Single {segment}", segment
        elif distance > radii["triple_in"]:
            return f"Triple {segment}", segment * 3
        else:
            return f"Single {segment}", segment

    def show_dart(self, x, y):
        if self.dart_marker:
            self.canvas.delete(self.dart_marker)
        r = 4
        self.dart_marker = self.canvas.create_oval(
            x - r, y - r, x + r, y + r,
            fill=COLORS["yellow"], outline=COLORS["white"], width=2
        )

    def simulate_throw(self):
        spread = random.uniform(0.2, 0.5)
        angle = random.uniform(0, 2 * math.pi)
        dist = abs(random.gauss(0, spread)) * self.size / 2 * 0.9
        x = self.center + dist * math.cos(angle)
        y = self.center + dist * math.sin(angle)
        x = max(0, min(self.size, x))
        y = max(0, min(self.size, y))
        self.show_dart(int(x), int(y))

        dx = x - self.center
        dy = -(y - self.center)
        distance = math.sqrt(dx * dx + dy * dy)
        a = math.degrees(math.atan2(dy, dx))
        if a < 0:
            a += 360
        scale = self.size / 2 * 0.9
        return self._calc_hit(distance, a, scale)

    def pack(self, **kwargs):
        self.canvas.pack(**kwargs)

    def grid(self, **kwargs):
        self.canvas.grid(**kwargs)


class GameLog:
    def __init__(self, parent):
        self.frame = tk.Frame(parent, bg=COLORS["bg"])
        self.text = scrolledtext.ScrolledText(
            self.frame, width=40, height=20, bg=COLORS["dark"],
            fg=COLORS["fg"], font=("Consolas", 10), wrap=tk.WORD,
            insertbackground=COLORS["fg"], highlightthickness=0,
            relief=tk.FLAT
        )
        self.text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.text.config(state=tk.DISABLED)

        self.text.tag_configure("hit", foreground=COLORS["green"])
        self.text.tag_configure("miss", foreground=COLORS["red"])
        self.text.tag_configure("info", foreground=COLORS["yellow"])
        self.text.tag_configure("success", foreground=COLORS["green"],
                                font=("Consolas", 10, "bold"))
        self.text.tag_configure("bold", font=("Consolas", 10, "bold"))
        self.text.tag_configure("warning", foreground="#ff8800")
        self.text.tag_configure("header", foreground=COLORS["accent"],
                                font=("Consolas", 11, "bold"))

    def log(self, text, tag=None):
        self.text.config(state=tk.NORMAL)
        if tag:
            self.text.insert(tk.END, text + "\n", tag)
        else:
            self.text.insert(tk.END, text + "\n")
        self.text.see(tk.END)
        self.text.config(state=tk.DISABLED)

    def add(self, text, tag=None):
        self.log(text, tag)

    def clear(self):
        self.text.config(state=tk.NORMAL)
        self.text.delete("1.0", tk.END)
        self.text.config(state=tk.DISABLED)

    def pack(self, **kwargs):
        self.frame.pack(**kwargs)

    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class ScorePanel:
    def __init__(self, parent):
        self.frame = tk.Frame(parent, bg=COLORS["card"], relief=tk.FLAT)
        self.labels = {}

    def set_scores(self, scores):
        for widget in self.frame.winfo_children():
            widget.destroy()
        self.labels.clear()

        tk.Label(self.frame, text="SPIELSTAND", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=(10, 5))

        for name, score in scores.items():
            f = tk.Frame(self.frame, bg=COLORS["card"])
            f.pack(fill=tk.X, padx=15, pady=2)

            tk.Label(f, text=name, bg=COLORS["card"], fg=COLORS["fg"],
                     font=("Arial", 11), anchor="w").pack(side=tk.LEFT)

            lbl = tk.Label(f, text=str(score), bg=COLORS["card"],
                           fg=COLORS["yellow"], font=("Arial", 14, "bold"),
                           anchor="e")
            lbl.pack(side=tk.RIGHT)
            self.labels[name] = lbl

    def update_score(self, name, score):
        if name in self.labels:
            self.labels[name].config(text=str(score))

    def pack(self, **kwargs):
        self.frame.pack(**kwargs)

    def grid(self, **kwargs):
        self.frame.grid(**kwargs)


class MenuButton(tk.Canvas):
    def __init__(self, parent, text, description="", command=None, color=None, **kwargs):
        super().__init__(parent, height=60, bg=COLORS["card"],
                         highlightthickness=0, cursor="hand2", **kwargs)
        self.color = color or COLORS["accent2"]
        self.command = command
        self.text_str = text
        self.desc_str = description

        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)
        self.bind("<Button-1>", self._on_click)
        self.bind("<Configure>", self._draw)

    def _draw(self, event=None):
        self.delete("all")
        w, h = self.winfo_width(), self.winfo_height()

        self.create_rectangle(0, 0, 4, h, fill=self.color, outline="")

        self.create_text(20, h // 2 - 8, text=self.text_str, fill=COLORS["white"],
                         font=("Arial", 12, "bold"), anchor="w")
        if self.desc_str:
            self.create_text(20, h // 2 + 12, text=self.desc_str, fill=COLORS["muted"],
                             font=("Arial", 9), anchor="w")

    def _on_enter(self, event):
        self.config(bg=COLORS["card_hover"])

    def _on_leave(self, event):
        self.config(bg=COLORS["card"])

    def _on_click(self, event):
        if self.command:
            self.command()


class DartGameGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Dart Game")
        self.root.configure(bg=COLORS["bg"])
        self.root.geometry("1100x700")
        self.root.minsize(900, 600)

        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.style.configure("TButton", background=COLORS["accent2"],
                             foreground=COLORS["white"], font=("Arial", 10, "bold"),
                             padding=8)
        self.style.map("TButton", background=[("active", COLORS["accent"])])

        self.current_frame = None
        self.show_main_menu()

    def clear_frame(self):
        if self.current_frame:
            self.current_frame.destroy()
        self.current_frame = tk.Frame(self.root, bg=COLORS["bg"])
        self.current_frame.pack(fill=tk.BOTH, expand=True)

    def show_main_menu(self):
        self.clear_frame()

        header = tk.Frame(self.current_frame, bg=COLORS["dark"], height=80)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        tk.Label(header, text="🎯 DART GAME", bg=COLORS["dark"],
                 fg=COLORS["accent"], font=("Arial", 24, "bold")).pack(pady=20)

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 15))

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(15, 0))

        tk.Label(left, text="SPIELE", bg=COLORS["bg"], fg=COLORS["accent"],
                 font=("Arial", 14, "bold"), anchor="w").pack(fill=tk.X, pady=(0, 10))

        games = [
            ("501 / 301 / 701", "Klassisches Dart-Spiel", COLORS["green"],
             self.show_standard_game),
            ("Cricket", "Nummern schliessen", COLORS["accent2"],
             self.show_cricket),
            ("Party-Minispiele", "Killer, Shanghai & mehr", COLORS["yellow"],
             self.show_minigames_menu),
            ("Training", "Alle Trainingsmodi", COLORS["accent"],
             self.show_training_menu),
            ("Abenteuer", "Tower Defense, World Tour & mehr", COLORS["red"],
             self.show_adventure_menu),
        ]

        for text, desc, color, cmd in games:
            btn = MenuButton(left, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3)

        tk.Label(right, text="MEHR SPIELE", bg=COLORS["bg"], fg=COLORS["accent"],
                 font=("Arial", 14, "bold"), anchor="w").pack(fill=tk.X, pady=(0, 10))

        tools = [
            ("Freies Werfen", "Wirf auf die Dartscheibe", COLORS["accent"],
             self.show_free_throw),
            ("Dart Bowling", "10 Frames Bowling", COLORS["yellow"],
             self.show_gui_bowling),
            ("Dart Memory", "Finde die Paare", COLORS["accent2"],
             self.show_gui_memory),
            ("Dart Blackjack", "Kartenspiel 21", COLORS["red"],
             self.show_gui_blackjack),
            ("Dart Duel", "1v1 Kampf", COLORS["accent"],
             self.show_gui_duel),
            ("Countdown", "501 runter auf 0", COLORS["green"],
             self.show_gui_countdown),
        ]

        for text, desc, color, cmd in tools:
            btn = MenuButton(right, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3)

        footer = tk.Frame(self.current_frame, bg=COLORS["dark"], height=40)
        footer.pack(fill=tk.X, side=tk.BOTTOM)
        footer.pack_propagate(False)
        tk.Label(footer, text="60+ Features | Python Dart Game",
                 bg=COLORS["dark"], fg=COLORS["muted"],
                 font=("Arial", 9)).pack(pady=10)

    def show_minigames_menu(self):
        self.clear_frame()
        self._make_header("PARTY-MINISPIELE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

        canvas = tk.Canvas(content, bg=COLORS["bg"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(content, orient="vertical", command=canvas.yview)
        scroll_frame = tk.Frame(canvas, bg=COLORS["bg"])
        scroll_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        games = [
            ("Killer", "Double-Duell 3+ Spieler", COLORS["red"],
             self.show_gui_killer),
            ("Shanghai", "Triff 15-20 + Bull", COLORS["accent2"],
             self.show_gui_shanghai),
            ("Dart Bingo", "5x5 Bingo-Karte", COLORS["yellow"],
             self.show_gui_bingo),
            ("Dart Roulette", "Gluecksrad", COLORS["accent"],
             self.show_gui_roulette),
            ("Dart Golf", "9 Loecher Par-System", COLORS["green"],
             self.show_gui_golf),
            ("Dart Poker", "Poker-Haende werfen", COLORS["accent2"],
             self.show_gui_poker),
            ("Lucky Number", "Glueckszahl treffen", COLORS["yellow"],
             self.show_gui_lucky_number),
            ("Math Darts", "Kopfrechnen", COLORS["accent"],
             self.show_gui_math),
            ("Dart War", "Territorien erobern", COLORS["red"],
             self.show_gui_war),
            ("Dart Assassin", "Geheime Ziele", COLORS["accent2"],
             self.show_gui_assassin),
            ("Dart Slots", "Spielautomat", COLORS["yellow"],
             self.show_gui_slots),
            ("Dart Auction", "Biete auf Segmente", COLORS["green"],
             self.show_gui_auction),
            ("Dart Maze", "Labyrinth navigieren", COLORS["accent"],
             self.show_gui_maze),
        ]

        for text, desc, color, cmd in games:
            btn = MenuButton(scroll_frame, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3, padx=5)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self._make_back_button(content)

    def show_training_menu(self):
        self.clear_frame()
        self._make_header("TRAINING")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

        modes = [
            ("Around the Clock", "1-20 + Bull", COLORS["green"],
             self.show_around_the_clock),
            ("Double Out", "D1-D20 Training", COLORS["accent2"],
             self.show_gui_double_out),
            ("Triple Challenge", "30 Darts Triples", COLORS["accent"],
             self.show_gui_triple_challenge),
            ("Target Practice", "Zieltraining", COLORS["yellow"],
             self.show_gui_target_practice),
            ("Speed Darts", "Schnell treffen!", COLORS["red"],
             self.show_gui_speed_darts),
            ("Kombo-Challenge", "Streak-Bonus", COLORS["accent2"],
             self.show_gui_combos),
            ("Endurance", "Ueberlebensmodus", COLORS["accent"],
             self.show_gui_endurance),
            ("Reaktionstest", "Reflex-Training", COLORS["yellow"],
             self.show_gui_reaction),
            ("Dart Puzzle", "Zahlenraetsel", COLORS["green"],
             self.show_gui_puzzle),
        ]

        for text, desc, color, cmd in modes:
            btn = MenuButton(content, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3)

        self._make_back_button(content)

    def show_adventure_menu(self):
        self.clear_frame()
        self._make_header("ABENTEUER")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

        modes = [
            ("Tower Defense", "Basis verteidigen", COLORS["red"],
             self.show_gui_tower_defense),
            ("World Tour", "Reise um die Welt", COLORS["green"],
             self.show_gui_world_tour),
            ("Survival", "Wellen-Modus", COLORS["accent"],
             self.show_gui_survival),
            ("Treasure Hunt", "Schatzkarte erkunden", COLORS["accent2"],
             self.show_gui_treasure),
            ("Penalty Shootout", "Elfmeter-Duell", COLORS["yellow"],
             self.show_gui_penalty),
            ("Dart Trivia", "Wissensfragen", COLORS["accent"],
             self.show_gui_trivia),
            ("Countdown", "501 runter auf 0", COLORS["green"],
             self.show_gui_countdown),
        ]

        for text, desc, color, cmd in modes:
            btn = MenuButton(content, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3)

        self._make_back_button(content)

    def show_free_throw(self):
        self.clear_frame()
        self._make_header("FREIES WERFEN")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=20, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=20, pady=10)

        self.throw_count = 0
        self.total_points = 0

        self.game_log = GameLog(right)
        self.game_log.pack(fill=tk.BOTH, expand=True)
        self.game_log.log("FREIES WERFEN", "header")
        self.game_log.log("Klicke auf die Dartscheibe oder")
        self.game_log.log("drücke 'Zufallswurf'.\n")

        def on_throw(result, points):
            self.throw_count += 1
            self.total_points += points
            avg = self.total_points / self.throw_count

            tag = "hit" if points > 0 else "miss"
            self.game_log.log(f"#{self.throw_count}: {result} ({points} Pkt)", tag)
            self.stats_label.config(
                text=f"Würfe: {self.throw_count} | Punkte: {self.total_points} | Ø {avg:.1f}"
            )

        board = DartBoardCanvas(left, size=450, on_throw=on_throw)
        board.pack(pady=10)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=10)

        def random_throw():
            result, points = board.simulate_throw()
            on_throw(result, points)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=random_throw).pack(
            side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🔄 Reset", command=lambda: self._reset_free(board)).pack(
            side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Zurück", command=self.show_main_menu).pack(
            side=tk.LEFT, padx=5)

        self.stats_label = tk.Label(left, text="Würfe: 0 | Punkte: 0 | Ø 0.0",
                                    bg=COLORS["bg"], fg=COLORS["yellow"],
                                    font=("Arial", 12, "bold"))
        self.stats_label.pack(pady=5)

    def _reset_free(self, board):
        self.throw_count = 0
        self.total_points = 0
        self.game_log.clear()
        self.game_log.log("FREIES WERFEN", "header")
        self.game_log.log("Reset! Neuer Start.\n")
        self.stats_label.config(text="Würfe: 0 | Punkte: 0 | Ø 0.0")
        if board.dart_marker:
            board.canvas.delete(board.dart_marker)

    def show_standard_game(self):
        self.clear_frame()
        self._make_header("NEUES SPIEL")

        setup = tk.Frame(self.current_frame, bg=COLORS["bg"])
        setup.pack(fill=tk.BOTH, expand=True, padx=50, pady=20)

        tk.Label(setup, text="Spielmodus:", bg=COLORS["bg"], fg=COLORS["fg"],
                 font=("Arial", 12)).pack(anchor="w", pady=(10, 5))

        self.game_mode_var = tk.StringVar(value="501")
        modes_frame = tk.Frame(setup, bg=COLORS["bg"])
        modes_frame.pack(fill=tk.X, pady=5)

        for mode in ["301", "501", "701"]:
            tk.Radiobutton(modes_frame, text=mode, variable=self.game_mode_var,
                           value=mode, bg=COLORS["bg"], fg=COLORS["fg"],
                           selectcolor=COLORS["card"], activebackground=COLORS["bg"],
                           activeforeground=COLORS["accent"],
                           font=("Arial", 11)).pack(side=tk.LEFT, padx=10)

        tk.Label(setup, text="Spieler 1:", bg=COLORS["bg"], fg=COLORS["fg"],
                 font=("Arial", 12)).pack(anchor="w", pady=(20, 5))
        self.p1_entry = tk.Entry(setup, bg=COLORS["card"], fg=COLORS["fg"],
                                 font=("Arial", 12), insertbackground=COLORS["fg"],
                                 relief=tk.FLAT)
        self.p1_entry.pack(fill=tk.X, pady=2, ipady=5)
        self.p1_entry.insert(0, "Spieler 1")

        tk.Label(setup, text="Spieler 2:", bg=COLORS["bg"], fg=COLORS["fg"],
                 font=("Arial", 12)).pack(anchor="w", pady=(15, 5))
        self.p2_entry = tk.Entry(setup, bg=COLORS["card"], fg=COLORS["fg"],
                                 font=("Arial", 12), insertbackground=COLORS["fg"],
                                 relief=tk.FLAT)
        self.p2_entry.pack(fill=tk.X, pady=2, ipady=5)
        self.p2_entry.insert(0, "Spieler 2")

        btn_frame = tk.Frame(setup, bg=COLORS["bg"])
        btn_frame.pack(pady=30)

        ttk.Button(btn_frame, text="🎯 Spiel starten",
                   command=self._start_standard_game).pack(side=tk.LEFT, padx=10)
        ttk.Button(btn_frame, text="← Zurück",
                   command=self.show_main_menu).pack(side=tk.LEFT, padx=10)

    def _start_standard_game(self):
        mode = int(self.game_mode_var.get())
        p1 = self.p1_entry.get().strip() or "Spieler 1"
        p2 = self.p2_entry.get().strip() or "Spieler 2"

        self.clear_frame()
        self._make_header(f"{mode} - {p1} vs {p2}")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        scores = {p1: mode, p2: mode}
        current_player = [p1]
        darts_left = [3]
        round_score = [0]

        score_panel = ScorePanel(right)
        score_panel.pack(fill=tk.X, pady=(0, 10))
        score_panel.set_scores(scores)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log(f"SPIEL: {mode}", "header")
        game_log.log(f"{p1} vs {p2}\n")
        game_log.log(f"{current_player[0]} ist dran", "info")

        turn_label = tk.Label(left, text=f"{current_player[0]} | Darts: 3 | Runde: 0",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 13, "bold"))
        turn_label.pack(pady=5)

        def on_throw(result, points):
            player = current_player[0]
            old_score = scores[player]
            new_score = old_score - points

            if new_score < 0 or new_score == 1:
                game_log.log(f"  BUST! ({result} = {points})", "miss")
                scores[player] = old_score + round_score[0]
                score_panel.update_score(player, scores[player])
                round_score[0] = 0
                darts_left[0] = 0
            elif new_score == 0:
                if "Double" in result or result == "Bullseye":
                    scores[player] = 0
                    score_panel.update_score(player, 0)
                    game_log.log(f"  {result} ({points}) - CHECKOUT!", "hit")
                    game_log.log(f"\n{player} GEWINNT!", "header")
                    board_widget.canvas.unbind("<Button-1>")
                    return
                else:
                    game_log.log(f"  BUST! Kein Double-Finish", "miss")
                    scores[player] = old_score + round_score[0]
                    score_panel.update_score(player, scores[player])
                    round_score[0] = 0
                    darts_left[0] = 0
            else:
                scores[player] = new_score
                round_score[0] += points
                score_panel.update_score(player, new_score)
                game_log.log(f"  {result} ({points})", "hit" if points > 0 else "miss")

            darts_left[0] -= 1

            if darts_left[0] <= 0:
                current_player[0] = p2 if player == p1 else p1
                darts_left[0] = 3
                round_score[0] = 0
                game_log.log(f"\n{current_player[0]} ist dran", "info")

            turn_label.config(
                text=f"{current_player[0]} | Darts: {darts_left[0]} | Score: {scores[current_player[0]]}"
            )

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim_throw():
            result, points = board_widget.simulate_throw()
            on_throw(result, points)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim_throw).pack(
            side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(
            side=tk.LEFT, padx=5)

    def _make_header(self, title):
        header = tk.Frame(self.current_frame, bg=COLORS["dark"], height=60)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        tk.Label(header, text=f"🎯 {title}", bg=COLORS["dark"],
                 fg=COLORS["accent"], font=("Arial", 18, "bold")).pack(
            side=tk.LEFT, padx=20, pady=15)

        ttk.Button(header, text="← Menü", command=self.show_main_menu).pack(
            side=tk.RIGHT, padx=20, pady=15)

    def _make_back_button(self, parent):
        ttk.Button(parent, text="← Zurück zum Hauptmenü",
                   command=self.show_main_menu).pack(pady=20)

    def show_cricket(self):
        self.clear_frame()
        self._make_header("CRICKET")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10, ipadx=10)

        cricket_nums = [20, 19, 18, 17, 16, 15, 25]
        p1, p2 = "Spieler 1", "Spieler 2"
        marks = {p1: {n: 0 for n in cricket_nums}, p2: {n: 0 for n in cricket_nums}}
        points = {p1: 0, p2: 0}
        current = [p1]
        darts_left = [3]

        cricket_frame = tk.Frame(right, bg=COLORS["card"])
        cricket_frame.pack(fill=tk.X, pady=5)

        tk.Label(cricket_frame, text="CRICKET", bg=COLORS["card"], fg=COLORS["accent"],
                 font=("Arial", 14, "bold")).grid(row=0, column=0, columnspan=4, pady=5)

        tk.Label(cricket_frame, text=p1, bg=COLORS["card"], fg=COLORS["green"],
                 font=("Arial", 11, "bold")).grid(row=1, column=1, padx=10)
        tk.Label(cricket_frame, text="Ziel", bg=COLORS["card"], fg=COLORS["fg"],
                 font=("Arial", 11, "bold")).grid(row=1, column=2, padx=10)
        tk.Label(cricket_frame, text=p2, bg=COLORS["card"], fg=COLORS["accent"],
                 font=("Arial", 11, "bold")).grid(row=1, column=3, padx=10)

        mark_labels = {p1: {}, p2: {}}
        for i, num in enumerate(cricket_nums):
            label = "Bull" if num == 25 else str(num)
            tk.Label(cricket_frame, text=label, bg=COLORS["card"], fg=COLORS["yellow"],
                     font=("Arial", 11, "bold")).grid(row=i + 2, column=2, padx=10, pady=2)

            l1 = tk.Label(cricket_frame, text="", bg=COLORS["card"], fg=COLORS["green"],
                          font=("Arial", 11))
            l1.grid(row=i + 2, column=1, padx=10, pady=2)
            mark_labels[p1][num] = l1

            l2 = tk.Label(cricket_frame, text="", bg=COLORS["card"], fg=COLORS["accent"],
                          font=("Arial", 11))
            l2.grid(row=i + 2, column=3, padx=10, pady=2)
            mark_labels[p2][num] = l2

        score_labels = {}
        pts_frame = tk.Frame(right, bg=COLORS["card"])
        pts_frame.pack(fill=tk.X, pady=5)
        for name in [p1, p2]:
            f = tk.Frame(pts_frame, bg=COLORS["card"])
            f.pack(fill=tk.X, padx=10, pady=3)
            tk.Label(f, text=name, bg=COLORS["card"], fg=COLORS["fg"],
                     font=("Arial", 11)).pack(side=tk.LEFT)
            lbl = tk.Label(f, text="0", bg=COLORS["card"], fg=COLORS["yellow"],
                           font=("Arial", 14, "bold"))
            lbl.pack(side=tk.RIGHT)
            score_labels[name] = lbl

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("CRICKET", "header")
        game_log.log(f"{current[0]} ist dran\n", "info")

        turn_label = tk.Label(left, text=f"{current[0]} | Darts: 3",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 13, "bold"))
        turn_label.pack(pady=5)

        def update_mark_display(player, num):
            m = marks[player][num]
            if m >= 3:
                mark_labels[player][num].config(text="XXX", fg=COLORS["green"])
            elif m == 2:
                mark_labels[player][num].config(text="XX")
            elif m == 1:
                mark_labels[player][num].config(text="X")

        def parse_cricket_hit(result):
            if result == "Bullseye":
                return 25, 2
            if result == "Bull":
                return 25, 1
            parts = result.split()
            if len(parts) == 2:
                try:
                    num = int(parts[1])
                except ValueError:
                    return 0, 0
                if parts[0] == "Triple":
                    return num, 3
                elif parts[0] == "Double":
                    return num, 2
                else:
                    return num, 1
            return 0, 0

        def check_winner():
            for name in [p1, p2]:
                if all(marks[name][n] >= 3 for n in cricket_nums):
                    other = p2 if name == p1 else p1
                    if points[name] >= points[other]:
                        return name
            return None

        def on_throw(result, pts):
            player = current[0]
            other = p2 if player == p1 else p1
            num, count = parse_cricket_hit(result)

            game_log.log(f"  {result} ({pts})", "hit" if num in cricket_nums else "miss")

            if num in cricket_nums:
                for _ in range(count):
                    if marks[player][num] < 3:
                        marks[player][num] += 1
                    elif marks[other][num] < 3:
                        points[player] += num
                        score_labels[player].config(text=str(points[player]))
                update_mark_display(player, num)

            winner = check_winner()
            if winner:
                game_log.log(f"\n{winner} GEWINNT CRICKET!", "header")
                board_widget.canvas.unbind("<Button-1>")
                return

            darts_left[0] -= 1
            if darts_left[0] <= 0:
                current[0] = other
                darts_left[0] = 3
                game_log.log(f"\n{current[0]} ist dran", "info")

            turn_label.config(text=f"{current[0]} | Darts: {darts_left[0]}")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_around_the_clock(self):
        self.clear_frame()
        self._make_header("AROUND THE CLOCK")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        targets = list(range(1, 21)) + [25]
        current_target = [0]
        total_darts = [0]
        hits = [0]

        progress_frame = tk.Frame(right, bg=COLORS["card"])
        progress_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(progress_frame, text="FORTSCHRITT", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        target_labels = {}
        grid_frame = tk.Frame(progress_frame, bg=COLORS["card"])
        grid_frame.pack(padx=10, pady=5)

        for i, t in enumerate(targets):
            row, col = i // 5, i % 5
            label_text = "Bull" if t == 25 else str(t)
            lbl = tk.Label(grid_frame, text=label_text, bg=COLORS["card"],
                           fg=COLORS["muted"], font=("Arial", 10), width=5)
            lbl.grid(row=row, column=col, padx=2, pady=2)
            target_labels[t] = lbl

        target_labels[targets[0]].config(fg=COLORS["yellow"],
                                         font=("Arial", 10, "bold"))

        info_label = tk.Label(right, text=f"Ziel: {targets[0]} | Darts: 0",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 13, "bold"))
        info_label.pack(pady=10)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("AROUND THE CLOCK", "header")
        game_log.log(f"Triff 1-20 + Bull der Reihe nach\n")

        def parse_num(result):
            if result == "Bullseye":
                return 25
            if result == "Bull":
                return 25
            parts = result.split()
            if len(parts) == 2:
                try:
                    return int(parts[1])
                except ValueError:
                    return 0
            try:
                return int(parts[0])
            except (ValueError, IndexError):
                return 0

        def on_throw(result, points):
            total_darts[0] += 1
            target = targets[current_target[0]]
            hit_num = parse_num(result)

            if hit_num == target:
                hits[0] += 1
                target_labels[target].config(fg=COLORS["green"])
                game_log.log(f"  {result} - TREFFER!", "hit")
                current_target[0] += 1

                if current_target[0] >= len(targets):
                    game_log.log(f"\nGESCHAFFT! {total_darts[0]} Darts", "header")
                    board_widget.canvas.unbind("<Button-1>")
                    info_label.config(text=f"FERTIG! {total_darts[0]} Darts")
                    return
                else:
                    new_target = targets[current_target[0]]
                    label = "Bull" if new_target == 25 else str(new_target)
                    target_labels[new_target].config(fg=COLORS["yellow"],
                                                     font=("Arial", 10, "bold"))
                    game_log.log(f"  Nächstes Ziel: {label}", "info")
            else:
                game_log.log(f"  {result} - daneben", "miss")

            target = targets[min(current_target[0], len(targets) - 1)]
            label = "Bull" if target == 25 else str(target)
            info_label.config(text=f"Ziel: {label} | Darts: {total_darts[0]} | Treffer: {hits[0]}")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_memory(self):
        self.clear_frame()
        self._make_header("DART MEMORY")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        symbols = ["♠", "♥", "♦", "♣", "★", "●"]
        cards = symbols * 2
        random.shuffle(cards)
        segments = random.sample(range(1, 21), len(cards))
        mem_board = {}
        for i, seg in enumerate(segments):
            mem_board[seg] = {"symbol": cards[i], "revealed": False, "matched": False}

        pairs_found = [0]
        first_pick = [None]
        state = ["picking_first"]

        cards_frame = tk.Frame(right, bg=COLORS["card"])
        cards_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(cards_frame, text="MEMORY KARTEN", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        card_labels = {}
        card_grid = tk.Frame(cards_frame, bg=COLORS["card"])
        card_grid.pack(padx=10, pady=5)

        for i, seg in enumerate(sorted(segments)):
            row, col = i // 4, i % 4
            lbl = tk.Label(card_grid, text=f"? ({seg})", bg=COLORS["dark"],
                           fg=COLORS["muted"], font=("Arial", 11), width=8,
                           relief=tk.RAISED, padx=5, pady=5)
            lbl.grid(row=row, column=col, padx=3, pady=3)
            card_labels[seg] = lbl

        info_label = tk.Label(right, text="Paare: 0/6 | Triff ein Segment!",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=10)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART MEMORY", "header")
        game_log.log("Triff Segmente um Karten aufzudecken\n")

        def reveal_card(seg):
            data = mem_board[seg]
            card_labels[seg].config(text=f"{data['symbol']} ({seg})",
                                    fg=COLORS["yellow"], bg=COLORS["card"])

        def hide_card(seg):
            card_labels[seg].config(text=f"? ({seg})", fg=COLORS["muted"],
                                    bg=COLORS["dark"])

        def match_card(seg):
            data = mem_board[seg]
            card_labels[seg].config(text=f"{data['symbol']} ({seg})",
                                    fg=COLORS["green"], bg=COLORS["card"])

        def on_throw(result, points):
            seg = 0
            if result in ("Bullseye", "Bull", "Miss"):
                game_log.log(f"  {result} - kein Kartensegment", "miss")
                return
            parts = result.split()
            if len(parts) == 2:
                try:
                    seg = int(parts[1])
                except ValueError:
                    seg = 0

            if state[0] == "waiting":
                return

            if seg not in mem_board:
                game_log.log(f"  {result} - kein Kartensegment", "miss")
                return

            if mem_board[seg]["matched"]:
                game_log.log(f"  {result} - bereits gefunden", "miss")
                return

            game_log.log(f"  {result}", "hit")
            sym = mem_board[seg]["symbol"]

            if state[0] == "picking_first":
                reveal_card(seg)
                mem_board[seg]["revealed"] = True
                first_pick[0] = seg
                state[0] = "picking_second"
                game_log.log(f"  Aufgedeckt: {sym}", "info")
                info_label.config(text=f"Paare: {pairs_found[0]}/6 | Zweite Karte!")

            elif state[0] == "picking_second":
                if seg == first_pick[0]:
                    game_log.log(f"  Gleiche Karte!", "miss")
                    return

                reveal_card(seg)
                mem_board[seg]["revealed"] = True
                sym2 = mem_board[seg]["symbol"]
                first_sym = mem_board[first_pick[0]]["symbol"]

                if first_sym == sym2:
                    pairs_found[0] += 1
                    mem_board[seg]["matched"] = True
                    mem_board[first_pick[0]]["matched"] = True
                    match_card(seg)
                    match_card(first_pick[0])
                    game_log.log(f"  PAAR GEFUNDEN! {sym}", "hit")

                    if pairs_found[0] >= 6:
                        game_log.log(f"\nALLE PAARE GEFUNDEN!", "header")
                        board_widget.canvas.unbind("<Button-1>")
                        info_label.config(text="GEWONNEN! Alle Paare gefunden!")
                        return
                else:
                    game_log.log(f"  Kein Paar: {first_sym} vs {sym2}", "miss")
                    f = first_pick[0]
                    s = seg

                    state[0] = "waiting"

                    def hide_both():
                        if state[0] != "waiting":
                            return
                        try:
                            hide_card(f)
                            hide_card(s)
                        except Exception:
                            return
                        mem_board[f]["revealed"] = False
                        mem_board[s]["revealed"] = False
                        state[0] = "picking_first"

                    self.root.after(1000, hide_both)

                first_pick[0] = None
                info_label.config(text=f"Paare: {pairs_found[0]}/6 | Erste Karte!")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_treasure(self):
        self.clear_frame()
        self._make_header("TREASURE HUNT")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        grid_size = 5
        grid = [[" " for _ in range(grid_size)] for _ in range(grid_size)]

        for _ in range(3):
            while True:
                r, c = random.randint(0, grid_size - 1), random.randint(0, grid_size - 1)
                if grid[r][c] == " ":
                    grid[r][c] = "T"
                    break

        for _ in range(2):
            while True:
                r, c = random.randint(0, grid_size - 1), random.randint(0, grid_size - 1)
                if grid[r][c] == " ":
                    grid[r][c] = "X"
                    break

        for _ in range(2):
            while True:
                r, c = random.randint(0, grid_size - 1), random.randint(0, grid_size - 1)
                if grid[r][c] == " ":
                    grid[r][c] = "+"
                    break

        while True:
            sr, sc = random.randint(0, grid_size - 1), random.randint(0, grid_size - 1)
            if grid[sr][sc] == " ":
                break

        player_pos = [sr, sc]
        visited = {(sr, sc)}
        health = [3]
        treasures_found = [0]
        gold = [0]
        turns_left = [20]

        map_frame = tk.Frame(right, bg=COLORS["card"])
        map_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(map_frame, text="SCHATZKARTE", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        cell_labels = {}
        map_grid = tk.Frame(map_frame, bg=COLORS["card"])
        map_grid.pack(padx=10, pady=5)

        for r in range(grid_size):
            for c in range(grid_size):
                lbl = tk.Label(map_grid, text="?", bg=COLORS["dark"],
                               fg=COLORS["muted"], font=("Arial", 14, "bold"),
                               width=3, height=1, relief=tk.RAISED)
                lbl.grid(row=r, column=c, padx=2, pady=2)
                cell_labels[(r, c)] = lbl

        cell_labels[(sr, sc)].config(text="@", fg=COLORS["accent"], bg=COLORS["card"])

        info_label = tk.Label(right, text=f"HP: 3 | Schaetze: 0/3 | Gold: 0 | Zuege: 20",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 11, "bold"))
        info_label.pack(pady=5)

        dir_label = tk.Label(right, text="40+=Hoch | 25-39=Rechts | 10-24=Runter | 0-9=Links",
                             bg=COLORS["bg"], fg=COLORS["muted"], font=("Arial", 9))
        dir_label.pack(pady=2)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("TREASURE HUNT", "header")
        game_log.log("Finde 3 Schaetze!\n")

        def update_map():
            for r in range(grid_size):
                for c in range(grid_size):
                    if (r, c) == (player_pos[0], player_pos[1]):
                        cell_labels[(r, c)].config(text="@", fg=COLORS["accent"],
                                                   bg=COLORS["card"])
                    elif (r, c) in visited:
                        cell = grid[r][c]
                        if cell == "T":
                            cell_labels[(r, c)].config(text="$", fg=COLORS["yellow"],
                                                       bg=COLORS["card"])
                        elif cell == "X":
                            cell_labels[(r, c)].config(text="!", fg=COLORS["red"],
                                                       bg=COLORS["card"])
                        elif cell == "+":
                            cell_labels[(r, c)].config(text="+", fg=COLORS["green"],
                                                       bg=COLORS["card"])
                        else:
                            cell_labels[(r, c)].config(text=".", fg=COLORS["muted"],
                                                       bg=COLORS["card"])
                    else:
                        cell_labels[(r, c)].config(text="?", fg=COLORS["muted"],
                                                   bg=COLORS["dark"])

        def update_info():
            hearts = "♥" * health[0]
            info_label.config(
                text=f"HP: {hearts} | Schaetze: {treasures_found[0]}/3 | Gold: {gold[0]} | Zuege: {turns_left[0]}"
            )

        def on_throw(result, points):
            if turns_left[0] <= 0 or health[0] <= 0 or treasures_found[0] >= 3:
                return

            if points >= 40:
                direction = "up"
            elif points >= 25:
                direction = "right"
            elif points >= 10:
                direction = "down"
            else:
                direction = "left"

            dir_names = {"up": "Hoch", "down": "Runter", "left": "Links", "right": "Rechts"}
            game_log.log(f"  {result} ({points}) = {dir_names[direction]}", "info")

            r, c = player_pos[0], player_pos[1]
            if direction == "up":
                r = max(0, r - 1)
            elif direction == "down":
                r = min(grid_size - 1, r + 1)
            elif direction == "left":
                c = max(0, c - 1)
            elif direction == "right":
                c = min(grid_size - 1, c + 1)

            if (r, c) == (player_pos[0], player_pos[1]):
                game_log.log("  Rand erreicht!", "miss")
                return

            player_pos[0], player_pos[1] = r, c
            visited.add((r, c))
            turns_left[0] -= 1

            cell = grid[r][c]
            if cell == "T":
                treasures_found[0] += 1
                reward = random.randint(50, 150)
                gold[0] += reward
                grid[r][c] = " "
                game_log.log(f"  SCHATZ! +{reward} Gold", "hit")
            elif cell == "X":
                health[0] -= 1
                grid[r][c] = " "
                game_log.log(f"  FALLE! -1 HP", "miss")
            elif cell == "+":
                health[0] = min(health[0] + 1, 5)
                grid[r][c] = " "
                game_log.log(f"  Heilung! +1 HP", "hit")
            else:
                game_log.log(f"  Leeres Feld", "miss")

            update_map()
            update_info()

            if treasures_found[0] >= 3:
                game_log.log(f"\nALLE SCHAETZE GEFUNDEN! {gold[0]} Gold", "header")
                board_widget.canvas.unbind("<Button-1>")
            elif health[0] <= 0:
                game_log.log(f"\nGAME OVER! Keine HP", "header")
                board_widget.canvas.unbind("<Button-1>")
            elif turns_left[0] <= 0:
                game_log.log(f"\nZeit abgelaufen!", "header")
                board_widget.canvas.unbind("<Button-1>")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_bowling(self):
        self.clear_frame()
        self._make_header("DART BOWLING")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        pin_segments = random.sample(range(1, 21), 10)
        pins = {}
        for i in range(10):
            pins[i + 1] = {"segment": pin_segments[i], "standing": True}

        frame_num = [1]
        ball_num = [1]
        total_score = [0]
        frame_knocked = [0]

        pin_frame = tk.Frame(right, bg=COLORS["card"])
        pin_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(pin_frame, text="PINS", bg=COLORS["card"], fg=COLORS["accent"],
                 font=("Arial", 12, "bold")).pack(pady=5)

        pin_labels = {}
        pin_grid = tk.Frame(pin_frame, bg=COLORS["card"])
        pin_grid.pack(padx=10, pady=5)

        pin_rows = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]]
        for row_idx, row in enumerate(pin_rows):
            row_frame = tk.Frame(pin_grid, bg=COLORS["card"])
            row_frame.pack(pady=2)
            for p in row:
                seg = pins[p]["segment"]
                lbl = tk.Label(row_frame, text=str(seg), bg=COLORS["yellow"],
                               fg=COLORS["dark"], font=("Arial", 10, "bold"),
                               width=4, relief=tk.RAISED)
                lbl.pack(side=tk.LEFT, padx=3)
                pin_labels[p] = lbl

        info_label = tk.Label(right, text=f"Frame 1/10 | Wurf 1 | Score: 0",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=10)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART BOWLING", "header")
        game_log.log("Triff Pin-Segmente!\n")

        def update_pins():
            for p in range(1, 11):
                if pins[p]["standing"]:
                    pin_labels[p].config(bg=COLORS["yellow"], fg=COLORS["dark"])
                else:
                    pin_labels[p].config(bg=COLORS["dark"], fg=COLORS["muted"],
                                         text="·")

        def reset_pins():
            new_segs = random.sample(range(1, 21), 10)
            for i in range(10):
                pins[i + 1]["segment"] = new_segs[i]
                pins[i + 1]["standing"] = True
                pin_labels[i + 1].config(text=str(new_segs[i]))
            update_pins()

        def parse_hit(result):
            if result in ("Bullseye", "Bull", "Miss"):
                return 0
            parts = result.split()
            if len(parts) == 2:
                try:
                    return int(parts[1])
                except ValueError:
                    return 0
            return 0

        def on_throw(result, points):
            if frame_num[0] > 10:
                return

            hit_seg = parse_hit(result)
            knocked = 0
            for p in range(1, 11):
                if pins[p]["standing"] and pins[p]["segment"] == hit_seg:
                    pins[p]["standing"] = False
                    knocked += 1

            if result in ("Bullseye", "Bull"):
                standing = [p for p in range(1, 11) if pins[p]["standing"]]
                if standing:
                    target = random.choice(standing)
                    pins[target]["standing"] = False
                    knocked += 1

            update_pins()
            frame_knocked[0] += knocked
            total_score[0] += knocked

            if knocked > 0:
                game_log.log(f"  {result} - {knocked} Pin(s)!", "hit")
            else:
                game_log.log(f"  {result} - daneben", "miss")

            standing = sum(1 for p in range(1, 11) if pins[p]["standing"])

            if standing == 0:
                if ball_num[0] == 1:
                    game_log.log("  STRIKE!", "header")
                    total_score[0] += 5
                else:
                    game_log.log("  SPARE!", "hit")
                    total_score[0] += 3
                frame_knocked[0] = 0
                ball_num[0] = 1
                frame_num[0] += 1
                reset_pins()
            elif ball_num[0] >= 2:
                frame_knocked[0] = 0
                ball_num[0] = 1
                frame_num[0] += 1
                reset_pins()
            else:
                ball_num[0] += 1

            if frame_num[0] > 10:
                game_log.log(f"\nSPIEL ENDE! Score: {total_score[0]}", "header")
                board_widget.canvas.unbind("<Button-1>")

            info_label.config(
                text=f"Frame {min(frame_num[0], 10)}/10 | Wurf {ball_num[0]} | Score: {total_score[0]}"
            )

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_blackjack(self):
        self.clear_frame()
        self._make_header("DART BLACKJACK")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        player_hand = []
        dealer_hand = []
        player_total = [0]
        dealer_total = [0]
        game_state = ["dealing_player"]
        chips = [100]
        bet = [10]

        cards_frame = tk.Frame(right, bg=COLORS["card"])
        cards_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(cards_frame, text="BLACKJACK", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        tk.Label(cards_frame, text="Deine Hand:", bg=COLORS["card"],
                 fg=COLORS["green"], font=("Arial", 11, "bold")).pack(anchor="w", padx=10)
        player_cards_label = tk.Label(cards_frame, text="", bg=COLORS["card"],
                                      fg=COLORS["fg"], font=("Arial", 13))
        player_cards_label.pack(anchor="w", padx=10)
        player_total_label = tk.Label(cards_frame, text="= 0", bg=COLORS["card"],
                                      fg=COLORS["yellow"], font=("Arial", 14, "bold"))
        player_total_label.pack(anchor="w", padx=10, pady=(0, 10))

        tk.Label(cards_frame, text="Dealer:", bg=COLORS["card"],
                 fg=COLORS["red"], font=("Arial", 11, "bold")).pack(anchor="w", padx=10)
        dealer_cards_label = tk.Label(cards_frame, text="", bg=COLORS["card"],
                                      fg=COLORS["fg"], font=("Arial", 13))
        dealer_cards_label.pack(anchor="w", padx=10)
        dealer_total_label = tk.Label(cards_frame, text="= ?", bg=COLORS["card"],
                                      fg=COLORS["yellow"], font=("Arial", 14, "bold"))
        dealer_total_label.pack(anchor="w", padx=10, pady=(0, 10))

        chips_label = tk.Label(right, text=f"Chips: {chips[0]} | Einsatz: {bet[0]}",
                               bg=COLORS["bg"], fg=COLORS["yellow"],
                               font=("Arial", 12, "bold"))
        chips_label.pack(pady=5)

        action_frame = tk.Frame(right, bg=COLORS["bg"])
        action_frame.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART BLACKJACK", "header")
        game_log.log("Wirf Darts um Karten zu ziehen!")
        game_log.log("Ziel: 21 ohne ueberziehen\n")

        def dart_to_value(result, points):
            if result == "Bullseye":
                return 11, "A"
            if result == "Bull":
                return 10, "10"
            if points == 0:
                return random.choice([2, 3]), "?"
            parts = result.split()
            if len(parts) == 2:
                try:
                    num = int(parts[1])
                    return min(num, 10), str(min(num, 10))
                except ValueError:
                    pass
            return min(points, 10), str(min(points, 10))

        def calc_hand(hand):
            total = sum(v for v, _ in hand)
            aces = sum(1 for v, _ in hand if v == 11)
            while total > 21 and aces > 0:
                total -= 10
                aces -= 1
            return total

        def update_display(hide_dealer=True):
            p_cards = " ".join(f"[{l}]" for _, l in player_hand)
            player_cards_label.config(text=p_cards)
            p_total = calc_hand(player_hand)
            player_total[0] = p_total
            color = "#cc2222" if p_total > 21 else "#22aa22" if p_total == 21 else "#f5c518"
            player_total_label.config(text=f"= {p_total}", fg=color)

            if hide_dealer and len(dealer_hand) > 1:
                d_cards = f"[{dealer_hand[0][1]}] [??]"
                dealer_cards_label.config(text=d_cards)
                dealer_total_label.config(text="= ?")
            else:
                d_cards = " ".join(f"[{l}]" for _, l in dealer_hand)
                dealer_cards_label.config(text=d_cards)
                d_total = calc_hand(dealer_hand)
                dealer_total[0] = d_total
                color = "#cc2222" if d_total > 21 else "#22aa22" if d_total == 21 else "#f5c518"
                dealer_total_label.config(text=f"= {d_total}", fg=color)

        def deal_initial():
            game_state[0] = "dealing_player"
            player_hand.clear()
            dealer_hand.clear()
            game_log.log("Neue Runde! Wirf fuer deine Karten", "info")

        def stand():
            game_state[0] = "dealer_turn"
            update_display(hide_dealer=False)
            game_log.log("\nDealer ist dran...", "info")
            dealer_draw()

        def dealer_draw():
            if game_state[0] != "dealer_turn":
                return
            d_total = calc_hand(dealer_hand)
            if d_total >= 17:
                resolve_round()
                return
            game_log.log("  Dealer zieht...", "info")
            r, p = board_widget.simulate_throw()
            v, l = dart_to_value(r, p)
            dealer_hand.append((v, l))
            game_log.log(f"  {r} = [{l}]", "hit")
            update_display(hide_dealer=False)
            self.root.after(800, dealer_draw)

        def resolve_round():
            p_total = calc_hand(player_hand)
            d_total = calc_hand(dealer_hand)
            update_display(hide_dealer=False)

            if p_total > 21:
                game_log.log(f"\nBUST! Du verlierst {bet[0]} Chips", "miss")
                chips[0] -= bet[0]
            elif d_total > 21:
                game_log.log(f"\nDealer BUST! +{bet[0]} Chips", "hit")
                chips[0] += bet[0]
            elif p_total > d_total:
                game_log.log(f"\nGewonnen! {p_total} > {d_total} +{bet[0]}", "hit")
                chips[0] += bet[0]
            elif p_total == d_total:
                game_log.log(f"\nUnentschieden! {p_total} = {d_total}", "info")
            else:
                game_log.log(f"\nVerloren! {p_total} < {d_total} -{bet[0]}", "miss")
                chips[0] -= bet[0]

            chips_label.config(text=f"Chips: {chips[0]} | Einsatz: {bet[0]}")
            game_state[0] = "round_over"

            for w in action_frame.winfo_children():
                w.destroy()
            ttk.Button(action_frame, text="Neue Runde",
                       command=lambda: new_round()).pack(side=tk.LEFT, padx=5)

        def new_round():
            for w in action_frame.winfo_children():
                w.destroy()
            deal_initial()

        def on_throw(result, points):
            v, l = dart_to_value(result, points)

            if game_state[0] == "dealing_player":
                player_hand.append((v, l))
                game_log.log(f"  {result} = [{l}]", "hit")
                update_display()

                if len(player_hand) >= 2:
                    game_state[0] = "player_turn"
                    r2, p2 = board_widget.simulate_throw()
                    v2, l2 = dart_to_value(r2, p2)
                    dealer_hand.append((v2, l2))
                    r3, p3 = board_widget.simulate_throw()
                    v3, l3 = dart_to_value(r3, p3)
                    dealer_hand.append((v3, l3))
                    update_display()

                    if calc_hand(player_hand) == 21:
                        game_log.log("  BLACKJACK!", "header")
                        chips[0] += int(bet[0] * 1.5)
                        chips_label.config(text=f"Chips: {chips[0]}")
                        game_state[0] = "round_over"
                        for w in action_frame.winfo_children():
                            w.destroy()
                        ttk.Button(action_frame, text="Neue Runde",
                                   command=new_round).pack(side=tk.LEFT, padx=5)
                        return

                    for w in action_frame.winfo_children():
                        w.destroy()
                    ttk.Button(action_frame, text="Hit (Ziehen)",
                               command=lambda: None).pack(side=tk.LEFT, padx=5)
                    ttk.Button(action_frame, text="Stand (Halten)",
                               command=stand).pack(side=tk.LEFT, padx=5)
                    game_log.log("\nHit = nochmal werfen | Stand = halten", "info")

            elif game_state[0] == "player_turn":
                player_hand.append((v, l))
                game_log.log(f"  {result} = [{l}]", "hit")
                update_display()

                if calc_hand(player_hand) > 21:
                    game_log.log("  BUST!", "miss")
                    resolve_round()
                elif calc_hand(player_hand) == 21:
                    game_log.log("  21!", "hit")
                    stand()

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

        deal_initial()

    def show_gui_war(self):
        self.clear_frame()
        self._make_header("DART WAR")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        territories = [
            {"name": "Nord", "segments": [1, 2, 3, 4, 5]},
            {"name": "Ost", "segments": [6, 7, 8, 9, 10]},
            {"name": "Sued", "segments": [11, 12, 13, 14, 15]},
            {"name": "West", "segments": [16, 17, 18, 19, 20]},
        ]

        p1, p2 = "Rot", "Blau"
        players = [p1, p2]
        p_colors = {p1: COLORS["red"], p2: COLORS["accent2"]}
        segment_owner = {}
        scores = {p1: 0, p2: 0}
        current = [p1]
        darts_left = [3]
        round_num = [1]
        max_rounds = 8

        map_frame = tk.Frame(right, bg=COLORS["card"])
        map_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(map_frame, text="KRIEGSKARTE", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        seg_labels = {}
        for terr in territories:
            tf = tk.Frame(map_frame, bg=COLORS["card"])
            tf.pack(fill=tk.X, padx=10, pady=3)
            tk.Label(tf, text=terr["name"], bg=COLORS["card"], fg=COLORS["yellow"],
                     font=("Arial", 10, "bold"), width=6).pack(side=tk.LEFT)
            for seg in terr["segments"]:
                lbl = tk.Label(tf, text=str(seg), bg=COLORS["dark"], fg=COLORS["muted"],
                               font=("Arial", 9), width=4, relief=tk.RAISED)
                lbl.pack(side=tk.LEFT, padx=2)
                seg_labels[seg] = lbl

        score_frame = tk.Frame(right, bg=COLORS["card"])
        score_frame.pack(fill=tk.X, pady=5, padx=5)
        score_labels = {}
        for name in players:
            f = tk.Frame(score_frame, bg=COLORS["card"])
            f.pack(fill=tk.X, padx=10, pady=2)
            tk.Label(f, text=name, bg=COLORS["card"], fg=p_colors[name],
                     font=("Arial", 11, "bold")).pack(side=tk.LEFT)
            lbl = tk.Label(f, text="0", bg=COLORS["card"], fg=COLORS["yellow"],
                           font=("Arial", 13, "bold"))
            lbl.pack(side=tk.RIGHT)
            score_labels[name] = lbl

        info_label = tk.Label(right, text=f"Runde 1/{max_rounds} | {current[0]} | Darts: 3",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART WAR", "header")
        game_log.log(f"Erobere Segmente! Double/Triple zum Stehlen\n")

        def update_seg(seg, owner):
            seg_labels[seg].config(bg=p_colors[owner], fg=COLORS["white"])

        def on_throw(result, points):
            if round_num[0] > max_rounds:
                return

            player = current[0]
            other = p2 if player == p1 else p1

            parts = result.split()
            hit_num = 0
            hit_type = "single"
            if result in ("Bullseye", "Bull", "Miss"):
                if result == "Bullseye":
                    scores[player] += 25
                    game_log.log(f"  {result} - +25 Bonus!", "hit")
                elif result == "Bull":
                    scores[player] += 10
                    game_log.log(f"  {result} - +10 Bonus!", "hit")
                else:
                    game_log.log(f"  {result} - daneben", "miss")
            elif len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    hit_num = 0
                if parts[0] == "Double":
                    hit_type = "double"
                elif parts[0] == "Triple":
                    hit_type = "triple"

                if hit_num > 0:
                    if hit_num not in segment_owner:
                        segment_owner[hit_num] = player
                        update_seg(hit_num, player)
                        earned = hit_num * (2 if hit_type == "double" else 3 if hit_type == "triple" else 1)
                        scores[player] += earned
                        game_log.log(f"  {result} - Segment {hit_num} erobert! +{earned}", "hit")
                    elif segment_owner[hit_num] == player:
                        scores[player] += 5
                        game_log.log(f"  {result} - eigenes Gebiet (+5)", "miss")
                    else:
                        if hit_type in ("double", "triple"):
                            segment_owner[hit_num] = player
                            update_seg(hit_num, player)
                            earned = hit_num * (2 if hit_type == "double" else 3)
                            scores[player] += earned
                            game_log.log(f"  {result} - GESTOHLEN von {other}! +{earned}", "hit")
                        else:
                            game_log.log(f"  {result} - {other}s Gebiet (Double noetig)", "miss")

            score_labels[player].config(text=str(scores[player]))

            darts_left[0] -= 1
            if darts_left[0] <= 0:
                current[0] = other
                darts_left[0] = 3
                if player == players[-1]:
                    round_num[0] += 1
                if round_num[0] > max_rounds:
                    s1, s2 = scores[players[0]], scores[players[1]]
                    if s1 == s2:
                        game_log.log(f"\nUNENTSCHIEDEN! {s1}-{s2}", "header")
                    else:
                        winner = max(scores, key=scores.get)
                        game_log.log(f"\n{winner} GEWINNT DART WAR!", "header")
                    board_widget.canvas.unbind("<Button-1>")
                else:
                    game_log.log(f"\n{current[0]} ist dran", "info")

            info_label.config(
                text=f"Runde {min(round_num[0], max_rounds)}/{max_rounds} | {current[0]} | Darts: {darts_left[0]}"
            )

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_tower_defense(self):
        self.clear_frame()
        self._make_header("TOWER DEFENSE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        towers = {}
        base_hp = [10]
        gold = [0]
        wave_num = [1]
        kills = [0]
        phase = ["build"]
        build_darts = [3]
        attack_darts = [3]
        enemies = [[] for _ in range(1)]
        enemies[0] = self._gen_wave(1)

        status_frame = tk.Frame(right, bg=COLORS["card"])
        status_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(status_frame, text="STATUS", bg=COLORS["card"], fg=COLORS["accent"],
                 font=("Arial", 12, "bold")).pack(pady=5)

        hp_label = tk.Label(status_frame, text="Basis: " + "♥" * 10, bg=COLORS["card"],
                            fg=COLORS["red"], font=("Arial", 12, "bold"))
        hp_label.pack(padx=10, pady=2)

        gold_label = tk.Label(status_frame, text="Gold: 0", bg=COLORS["card"],
                              fg=COLORS["yellow"], font=("Arial", 11, "bold"))
        gold_label.pack(padx=10, pady=2)

        wave_label = tk.Label(status_frame, text="Welle: 1 | Bauphase", bg=COLORS["card"],
                              fg=COLORS["fg"], font=("Arial", 11))
        wave_label.pack(padx=10, pady=2)

        tower_frame = tk.Frame(right, bg=COLORS["card"])
        tower_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(tower_frame, text="TUERME", bg=COLORS["card"], fg=COLORS["accent"],
                 font=("Arial", 11, "bold")).pack(pady=3)

        tower_list = tk.Label(tower_frame, text="Keine", bg=COLORS["card"],
                              fg=COLORS["muted"], font=("Arial", 9),
                              justify=tk.LEFT, anchor="w")
        tower_list.pack(padx=10, pady=2, fill=tk.X)

        enemy_frame = tk.Frame(right, bg=COLORS["card"])
        enemy_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(enemy_frame, text="FEINDE", bg=COLORS["card"], fg=COLORS["red"],
                 font=("Arial", 11, "bold")).pack(pady=3)

        enemy_list = tk.Label(enemy_frame, text="", bg=COLORS["card"],
                              fg=COLORS["fg"], font=("Arial", 9),
                              justify=tk.LEFT, anchor="w")
        enemy_list.pack(padx=10, pady=2, fill=tk.X)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("TOWER DEFENSE", "header")
        game_log.log(f"Welle 1 - BAUPHASE ({build_darts[0]} Darts)\n", "info")

        def update_display():
            hp_label.config(text="Basis: " + "♥" * base_hp[0] + "♡" * (10 - base_hp[0]))
            gold_label.config(text=f"Gold: {gold[0]} | Kills: {kills[0]}")

            phase_name = "Bauphase" if phase[0] == "build" else "Kampfphase"
            darts = build_darts[0] if phase[0] == "build" else attack_darts[0]
            wave_label.config(text=f"Welle: {wave_num[0]} | {phase_name} | Darts: {darts}")

            if towers:
                lines = []
                for seg in sorted(towers.keys()):
                    t_type = towers[seg]["type"]
                    names = {"single": "Wachturm", "double": "Kanone", "triple": "Festung"}
                    lines.append(f"Seg {seg}: {names[t_type]}")
                tower_list.config(text="\n".join(lines), fg=COLORS["green"])
            else:
                tower_list.config(text="Keine", fg=COLORS["muted"])

            if enemies[0]:
                lines = []
                for e in enemies[0]:
                    if e["hp"] > 0:
                        lines.append(f"{e['name']} HP:{e['hp']}/{e['max_hp']} Seg:{e['position']}")
                enemy_list.config(text="\n".join(lines) if lines else "Alle besiegt!")
            else:
                enemy_list.config(text="Keine Feinde")

        def next_wave():
            wave_num[0] += 1
            enemies[0] = self._gen_wave(wave_num[0])
            phase[0] = "build"
            build_darts[0] = 3
            attack_darts[0] = 3
            game_log.log(f"\nWelle {wave_num[0]} - BAUPHASE", "info")
            update_display()

        def on_throw(result, points):
            if base_hp[0] <= 0:
                return

            parts = result.split()
            hit_num = 0
            hit_type = "single"
            if len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    hit_num = 0
                if parts[0] == "Double":
                    hit_type = "double"
                elif parts[0] == "Triple":
                    hit_type = "triple"

            if phase[0] == "build":
                if result == "Bullseye":
                    for t in towers.values():
                        if t["type"] == "single":
                            t["type"] = "double"
                        elif t["type"] == "double":
                            t["type"] = "triple"
                    game_log.log(f"  {result} - Alle Tuerme aufgewertet!", "hit")
                elif result == "Bull":
                    gold[0] += 25
                    game_log.log(f"  {result} - +25 Gold!", "hit")
                elif hit_num > 0:
                    if hit_num in towers:
                        old = towers[hit_num]["type"]
                        if (old == "single" and hit_type in ("double", "triple")) or \
                           (old == "double" and hit_type == "triple"):
                            towers[hit_num]["type"] = hit_type
                            game_log.log(f"  {result} - Turm aufgewertet!", "hit")
                        else:
                            game_log.log(f"  {result} - Turm bereits da", "miss")
                    else:
                        towers[hit_num] = {"type": hit_type}
                        names = {"single": "Wachturm", "double": "Kanone", "triple": "Festung"}
                        game_log.log(f"  {result} - {names[hit_type]} gebaut!", "hit")
                else:
                    game_log.log(f"  {result} - daneben", "miss")

                build_darts[0] -= 1
                if build_darts[0] <= 0:
                    phase[0] = "attack"
                    game_log.log(f"\nKAMPFPHASE! ({attack_darts[0]} Darts)", "info")

            elif phase[0] == "attack":
                alive = [e for e in enemies[0] if e["hp"] > 0]
                hit_enemy = None

                if result == "Bullseye":
                    if alive:
                        hit_enemy = alive[0]
                        hit_enemy["hp"] -= 50
                elif hit_num > 0:
                    for e in alive:
                        if e["position"] == hit_num:
                            hit_enemy = e
                            break
                    if hit_enemy:
                        hit_enemy["hp"] -= points

                if hit_enemy:
                    if hit_enemy["hp"] <= 0:
                        hit_enemy["hp"] = 0
                        gold[0] += hit_enemy["reward"]
                        kills[0] += 1
                        e_name = hit_enemy["name"]
                        e_reward = hit_enemy["reward"]
                        game_log.log(f"  {result} - {e_name} besiegt! +{e_reward}G", "hit")
                    else:
                        e_name = hit_enemy["name"]
                        game_log.log(f"  {result} - {e_name} getroffen!", "hit")
                else:
                    game_log.log(f"  {result} - daneben", "miss")

                attack_darts[0] -= 1
                if attack_darts[0] <= 0:
                    dmg_map = {"single": 1, "double": 3, "triple": 5}
                    for seg, tower in towers.items():
                        for e in enemies[0]:
                            if e["hp"] > 0 and e["position"] == seg:
                                d = dmg_map[tower["type"]]
                                e["hp"] = max(0, e["hp"] - d)
                                if e["hp"] <= 0:
                                    gold[0] += e["reward"]
                                    kills[0] += 1

                    survivors = sum(1 for e in enemies[0] if e["hp"] > 0)
                    if survivors > 0:
                        base_hp[0] = max(0, base_hp[0] - survivors)
                        game_log.log(f"  {survivors} Feinde treffen Basis! -{survivors} HP", "miss")

                    if base_hp[0] <= 0:
                        game_log.log(f"\nGAME OVER! Welle {wave_num[0]}", "header")
                        board_widget.canvas.unbind("<Button-1>")
                    else:
                        alive = sum(1 for e in enemies[0] if e["hp"] > 0)
                        if alive == 0:
                            bonus = wave_num[0] * 5
                            gold[0] += bonus
                            game_log.log(f"  Welle geschafft! +{bonus}G Bonus", "hit")
                            next_wave()
                        else:
                            game_log.log(f"  {alive} Feinde übrig!", "warning")

            update_display()

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

        update_display()

    def _gen_wave(self, wave_num):
        enemy_types = [
            {"name": "Goblin", "hp": 2, "reward": 5},
            {"name": "Ork", "hp": 4, "reward": 10},
            {"name": "Troll", "hp": 7, "reward": 20},
            {"name": "Drache", "hp": 12, "reward": 50},
        ]
        enemies = []
        count = min(3 + wave_num, 8)
        for _ in range(count):
            tier = min(wave_num // 2, len(enemy_types) - 1)
            t = random.randint(0, tier)
            e = dict(enemy_types[t])
            e["hp"] = int(e["hp"] * (1 + wave_num * 0.1))
            e["max_hp"] = e["hp"]
            e["position"] = random.randint(1, 20)
            enemies.append(e)
        return enemies

    def show_gui_penalty(self):
        self.clear_frame()
        self._make_header("PENALTY SHOOTOUT")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        p1, p2 = "Heim", "Gast"
        targets_pool = [
            {"name": "Oben Links", "segs": [20]},
            {"name": "Oben Rechts", "segs": [18]},
            {"name": "Mitte", "segs": [25]},
            {"name": "Unten Links", "segs": [19]},
            {"name": "Unten Rechts", "segs": [16]},
        ]
        p1_goals = [0]
        p2_goals = [0]
        round_num = [1]
        current = [p1]
        chosen_target = [None]
        p1_results = []
        p2_results = []

        score_frame = tk.Frame(right, bg=COLORS["card"])
        score_frame.pack(fill=tk.X, pady=5, padx=5)
        tk.Label(score_frame, text="PENALTY SHOOTOUT", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        p1_score_label = tk.Label(score_frame, text=f"{p1}: 0", bg=COLORS["card"],
                                  fg=COLORS["green"], font=("Arial", 16, "bold"))
        p1_score_label.pack(pady=2)
        p1_dots = tk.Label(score_frame, text="", bg=COLORS["card"],
                           fg=COLORS["fg"], font=("Arial", 14))
        p1_dots.pack()

        p2_score_label = tk.Label(score_frame, text=f"{p2}: 0", bg=COLORS["card"],
                                  fg=COLORS["accent"], font=("Arial", 16, "bold"))
        p2_score_label.pack(pady=2)
        p2_dots = tk.Label(score_frame, text="", bg=COLORS["card"],
                           fg=COLORS["fg"], font=("Arial", 14))
        p2_dots.pack()

        round_label = tk.Label(score_frame, text="Runde 1/5", bg=COLORS["card"],
                               fg=COLORS["yellow"], font=("Arial", 11, "bold"))
        round_label.pack(pady=5)

        target_frame = tk.Frame(right, bg=COLORS["card"])
        target_frame.pack(fill=tk.X, pady=5, padx=5)
        tk.Label(target_frame, text="ZIEL WAEHLEN", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 11, "bold")).pack(pady=3)

        target_buttons = []
        for t in targets_pool:
            btn = ttk.Button(target_frame, text=t["name"],
                             command=lambda tgt=t: select_target(tgt))
            btn.pack(fill=tk.X, padx=10, pady=2)
            target_buttons.append(btn)

        target_info = tk.Label(target_frame, text="Waehle ein Ziel, dann wirf!",
                               bg=COLORS["card"], fg=COLORS["muted"], font=("Arial", 9))
        target_info.pack(pady=3)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("PENALTY SHOOTOUT", "header")
        game_log.log(f"{p1} vs {p2} - 5 Schuesse\n")
        game_log.log(f"{current[0]} waehlt ein Ziel...", "info")

        def select_target(tgt):
            chosen_target[0] = tgt
            target_info.config(text=f"Ziel: {tgt['name']} - Jetzt werfen!",
                               fg=COLORS["yellow"])

        def update_display():
            p1_score_label.config(text=f"{p1}: {p1_goals[0]}")
            p2_score_label.config(text=f"{p2}: {p2_goals[0]}")
            d1 = " ".join("O" if g else "X" for g in p1_results)
            d2 = " ".join("O" if g else "X" for g in p2_results)
            p1_dots.config(text=d1)
            p2_dots.config(text=d2)
            round_label.config(text=f"Runde {round_num[0]}/5 | {current[0]}")

        def on_throw(result, points):
            if chosen_target[0] is None:
                game_log.log("  Waehle erst ein Ziel!", "miss")
                return
            if round_num[0] > 5:
                return

            tgt = chosen_target[0]
            parts = result.split()
            hit_num = 0
            if result == "Bullseye" or result == "Bull":
                hit_num = 25
            elif len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    pass

            is_goal = hit_num in tgt["segs"]
            player = current[0]

            if is_goal:
                game_log.log(f"  {player}: {result} - TOR!", "hit")
                if player == p1:
                    p1_goals[0] += 1
                    p1_results.append(True)
                else:
                    p2_goals[0] += 1
                    p2_results.append(True)
            else:
                game_log.log(f"  {player}: {result} - Daneben!", "miss")
                if player == p1:
                    p1_results.append(False)
                else:
                    p2_results.append(False)

            chosen_target[0] = None
            target_info.config(text="Waehle ein Ziel!", fg=COLORS["muted"])

            if current[0] == p1:
                current[0] = p2
            else:
                current[0] = p1
                round_num[0] += 1

            update_display()

            if round_num[0] > 5:
                if p1_goals[0] > p2_goals[0]:
                    game_log.log(f"\n{p1} GEWINNT {p1_goals[0]}-{p2_goals[0]}!", "header")
                elif p2_goals[0] > p1_goals[0]:
                    game_log.log(f"\n{p2} GEWINNT {p2_goals[0]}-{p1_goals[0]}!", "header")
                else:
                    game_log.log(f"\nUNENTSCHIEDEN! Sudden Death!", "header")
                    round_num[0] = 5
                    return
                board_widget.canvas.unbind("<Button-1>")
                return

            game_log.log(f"{current[0]} waehlt ein Ziel...", "info")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_puzzle(self):
        self.clear_frame()
        self._make_header("DART PUZZLE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        def gen_puzzle():
            start = random.randint(1, 8)
            step = random.randint(1, 4)
            seq = [start + i * step for i in range(4)]
            answer = seq[-1] + step
            if answer > 20:
                start = random.randint(1, 5)
                step = random.randint(1, 3)
                seq = [start + i * step for i in range(4)]
                answer = seq[-1] + step
            return seq, answer, f"+{step}"

        puzzles_total = 8
        puzzle_num = [1]
        score = [0]
        solved = [0]
        darts_left = [3]
        current_seq, current_answer, current_hint = gen_puzzle()
        seq_data = [current_seq, current_answer, current_hint]

        puzzle_frame = tk.Frame(right, bg=COLORS["card"])
        puzzle_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(puzzle_frame, text="ZAHLENRAETSEL", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        seq_label = tk.Label(puzzle_frame, text="", bg=COLORS["card"],
                             fg=COLORS["fg"], font=("Arial", 18, "bold"))
        seq_label.pack(pady=5)

        answer_label = tk.Label(puzzle_frame, text="", bg=COLORS["card"],
                                fg=COLORS["yellow"], font=("Arial", 14, "bold"))
        answer_label.pack(pady=3)

        hint_label = tk.Label(puzzle_frame, text="", bg=COLORS["card"],
                              fg=COLORS["muted"], font=("Arial", 10))
        hint_label.pack(pady=3)

        info_label = tk.Label(right, text="", bg=COLORS["bg"],
                              fg=COLORS["yellow"], font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART PUZZLE", "header")

        def update_puzzle():
            seq_label.config(text="  ".join(str(n) for n in seq_data[0]) + "  ?")
            answer_label.config(text=f"Triff Segment: {seq_data[1]}")
            hint_label.config(text=f"Hinweis: {seq_data[2]}")
            info_label.config(
                text=f"Puzzle {puzzle_num[0]}/{puzzles_total} | Score: {score[0]} | Darts: {darts_left[0]}"
            )

        def next_puzzle():
            puzzle_num[0] += 1
            if puzzle_num[0] > puzzles_total:
                game_log.log(f"\nFERTIG! {solved[0]}/{puzzles_total} geloest, {score[0]} Punkte", "header")
                board_widget.canvas.unbind("<Button-1>")
                return
            s, a, h = gen_puzzle()
            seq_data[0], seq_data[1], seq_data[2] = s, a, h
            darts_left[0] = 3
            update_puzzle()
            game_log.log(f"\nPuzzle {puzzle_num[0]}", "info")

        def on_throw(result, points):
            if puzzle_num[0] > puzzles_total:
                return

            parts = result.split()
            hit_num = 0
            if len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    pass
            elif result not in ("Bullseye", "Bull", "Miss"):
                try:
                    hit_num = int(result)
                except ValueError:
                    pass

            if hit_num == seq_data[1]:
                bonus = (darts_left[0]) * 50
                earned = 100 + bonus
                score[0] += earned
                solved[0] += 1
                game_log.log(f"  {result} - GELOEST! +{earned}", "hit")
                next_puzzle()
            else:
                darts_left[0] -= 1
                if hit_num > 0:
                    diff = abs(hit_num - seq_data[1])
                    if diff <= 2:
                        game_log.log(f"  {result} - Knapp! (+-{diff})", "miss")
                    else:
                        game_log.log(f"  {result} - Falsch", "miss")
                else:
                    game_log.log(f"  {result} - Daneben", "miss")

                if darts_left[0] <= 0:
                    game_log.log(f"  Antwort war: {seq_data[1]}", "miss")
                    next_puzzle()

            update_puzzle()

        update_puzzle()
        game_log.log(f"Puzzle 1 - Los geht's!\n", "info")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_shanghai(self):
        self.clear_frame()
        self._make_header("SHANGHAI")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        targets = [15, 16, 17, 18, 19, 20, 25]
        round_idx = [0]
        score = [0]
        darts_left = [3]
        round_hits = [{"single": False, "double": False, "triple": False}]

        progress_frame = tk.Frame(right, bg=COLORS["card"])
        progress_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(progress_frame, text="SHANGHAI", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        target_labels = {}
        for t in targets:
            label = "Bull" if t == 25 else str(t)
            lbl = tk.Label(progress_frame, text=label, bg=COLORS["card"],
                           fg=COLORS["muted"], font=("Arial", 11), width=6)
            lbl.pack(pady=1)
            target_labels[t] = lbl

        target_labels[targets[0]].config(fg=COLORS["yellow"], font=("Arial", 11, "bold"))

        info_label = tk.Label(right, text="", bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("SHANGHAI", "header")
        game_log.log("Triff nur die aktuelle Zielzahl!\n")

        def update_info():
            if round_idx[0] < len(targets):
                t = targets[round_idx[0]]
                label = "Bull" if t == 25 else str(t)
                info_label.config(text=f"Ziel: {label} | Score: {score[0]} | Darts: {darts_left[0]}")

        def next_round():
            if round_idx[0] < len(targets):
                target_labels[targets[round_idx[0]]].config(fg=COLORS["green"])
            round_idx[0] += 1
            darts_left[0] = 3
            round_hits[0] = {"single": False, "double": False, "triple": False}
            if round_idx[0] >= len(targets):
                game_log.log(f"\nFERTIG! Endstand: {score[0]}", "header")
                board_widget.canvas.unbind("<Button-1>")
            else:
                t = targets[round_idx[0]]
                label = "Bull" if t == 25 else str(t)
                target_labels[t].config(fg=COLORS["yellow"], font=("Arial", 11, "bold"))
                game_log.log(f"\nZiel: {label}", "info")
            update_info()

        def on_throw(result, points):
            if round_idx[0] >= len(targets):
                return

            target = targets[round_idx[0]]
            parts = result.split()
            hit_num = 0
            hit_type = "single"

            if result == "Bullseye":
                hit_num = 25
                hit_type = "double"
            elif result == "Bull":
                hit_num = 25
                hit_type = "single"
            elif len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    pass
                if parts[0] == "Double":
                    hit_type = "double"
                elif parts[0] == "Triple":
                    hit_type = "triple"

            if hit_num == target:
                if hit_type == "triple":
                    earned = target * 3
                    round_hits[0]["triple"] = True
                elif hit_type == "double":
                    earned = target * 2
                    round_hits[0]["double"] = True
                else:
                    earned = target
                    round_hits[0]["single"] = True
                score[0] += earned
                game_log.log(f"  {result} - +{earned}!", "hit")

                if target != 25 and all(round_hits[0].values()):
                    game_log.log(f"\nSHANGHAI! Sofort-Sieg!", "header")
                    board_widget.canvas.unbind("<Button-1>")
                    update_info()
                    return
            else:
                game_log.log(f"  {result} - zaehlt nicht", "miss")

            darts_left[0] -= 1
            if darts_left[0] <= 0:
                next_round()
            update_info()

        update_info()
        game_log.log(f"Ziel: 15\n", "info")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_roulette(self):
        self.clear_frame()
        self._make_header("DART ROULETTE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        wheel_segments = [
            ("x2", COLORS["green"]), ("x3", COLORS["yellow"]),
            ("BONUS +50", COLORS["accent2"]), ("ZERO", COLORS["red"]),
            ("x2", COLORS["green"]), ("JACKPOT", COLORS["yellow"]),
            ("x1", COLORS["muted"]), ("x2", COLORS["green"]),
            ("SWAP", COLORS["accent"]), ("x3", COLORS["yellow"]),
            ("x1", COLORS["muted"]), ("BONUS +100", COLORS["accent2"]),
        ]

        score = [0]
        spins = [0]
        max_spins = 10

        wheel_frame = tk.Frame(right, bg=COLORS["card"])
        wheel_frame.pack(fill=tk.X, pady=5, padx=5)
        tk.Label(wheel_frame, text="GLUECKSRAD", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        wheel_labels = []
        for text, color in wheel_segments:
            lbl = tk.Label(wheel_frame, text=text, bg=COLORS["card"],
                           fg=color, font=("Arial", 10))
            lbl.pack(pady=1)
            wheel_labels.append(lbl)

        info_label = tk.Label(right, text=f"Score: 0 | Spins: 0/{max_spins}",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART ROULETTE", "header")
        game_log.log("Wirf und drehe das Rad!\n")

        def on_throw(result, points):
            if spins[0] >= max_spins:
                return

            spins[0] += 1
            seg_idx = random.randint(0, len(wheel_segments) - 1)
            seg_text, seg_color = wheel_segments[seg_idx]

            for i, lbl in enumerate(wheel_labels):
                if i == seg_idx:
                    lbl.config(font=("Arial", 12, "bold"), bg=COLORS["dark"])
                else:
                    lbl.config(font=("Arial", 10), bg=COLORS["card"])

            earned = 0
            if seg_text == "x2":
                earned = points * 2
            elif seg_text == "x3":
                earned = points * 3
            elif seg_text == "x1":
                earned = points
            elif seg_text == "BONUS +50":
                earned = points + 50
            elif seg_text == "BONUS +100":
                earned = points + 100
            elif seg_text == "JACKPOT":
                earned = points * 5
            elif seg_text == "ZERO":
                earned = 0
            elif seg_text == "SWAP":
                earned = 20 - points if points < 20 else points

            score[0] += earned
            game_log.log(f"  {result} ({points}) + {seg_text} = +{earned}", "hit" if earned > 0 else "miss")
            info_label.config(text=f"Score: {score[0]} | Spins: {spins[0]}/{max_spins}")

            if spins[0] >= max_spins:
                game_log.log(f"\nENDE! Endstand: {score[0]}", "header")
                board_widget.canvas.unbind("<Button-1>")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_golf(self):
        self.clear_frame()
        self._make_header("DART GOLF")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        holes = []
        for i in range(9):
            target = random.choice(range(1, 21))
            par = random.choice([2, 3, 3, 4])
            holes.append({"target": target, "par": par, "strokes": 0, "done": False})

        current_hole = [0]
        total_strokes = [0]
        total_par = sum(h["par"] for h in holes)

        scorecard_frame = tk.Frame(right, bg=COLORS["card"])
        scorecard_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(scorecard_frame, text="SCORECARD", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        hole_labels = []
        for i, h in enumerate(holes):
            lbl = tk.Label(scorecard_frame,
                           text=f"Loch {i+1}: Seg {h['target']} Par {h['par']} - ",
                           bg=COLORS["card"], fg=COLORS["muted"], font=("Arial", 10))
            lbl.pack(anchor="w", padx=10)
            hole_labels.append(lbl)

        hole_labels[0].config(fg=COLORS["yellow"])

        info_label = tk.Label(right, text="", bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DART GOLF", "header")
        game_log.log(f"9 Loecher, Par {total_par}\n")

        def update_info():
            if current_hole[0] < 9:
                h = holes[current_hole[0]]
                info_label.config(
                    text=f"Loch {current_hole[0]+1} | Ziel: Seg {h['target']} | Par {h['par']} | Schlaege: {h['strokes']}"
                )

        def on_throw(result, points):
            if current_hole[0] >= 9:
                return

            h = holes[current_hole[0]]
            h["strokes"] += 1
            total_strokes[0] += 1

            parts = result.split()
            hit_num = 0
            if len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    pass

            if hit_num == h["target"]:
                diff = h["strokes"] - h["par"]
                if diff <= -2:
                    name = "Eagle!"
                elif diff == -1:
                    name = "Birdie!"
                elif diff == 0:
                    name = "Par"
                else:
                    name = "Bogey"
                game_log.log(f"  {result} - EINGELOCHT! {name} ({h['strokes']} Schlaege)", "hit")
                hole_labels[current_hole[0]].config(
                    text=f"Loch {current_hole[0]+1}: {h['strokes']} (Par {h['par']})",
                    fg=COLORS["green"] if diff <= 0 else COLORS["red"]
                )
                current_hole[0] += 1
                if current_hole[0] < 9:
                    hole_labels[current_hole[0]].config(fg=COLORS["yellow"])
                    game_log.log(f"\nLoch {current_hole[0]+1}: Seg {holes[current_hole[0]]['target']}", "info")
                else:
                    rel = total_strokes[0] - total_par
                    rel_str = f"+{rel}" if rel > 0 else str(rel)
                    game_log.log(f"\nFERTIG! {total_strokes[0]} Schlaege ({rel_str})", "header")
                    board_widget.canvas.unbind("<Button-1>")
            else:
                if hit_num > 0:
                    diff = abs(hit_num - h["target"])
                    game_log.log(f"  {result} - daneben (+-{diff})", "miss")
                else:
                    game_log.log(f"  {result} - daneben", "miss")

                if h["strokes"] >= h["par"] + 3:
                    game_log.log(f"  Max erreicht, naechstes Loch", "miss")
                    hole_labels[current_hole[0]].config(
                        text=f"Loch {current_hole[0]+1}: {h['strokes']} (Par {h['par']})",
                        fg=COLORS["red"]
                    )
                    current_hole[0] += 1
                    if current_hole[0] < 9:
                        hole_labels[current_hole[0]].config(fg=COLORS["yellow"])
                        game_log.log(f"\nLoch {current_hole[0]+1}: Seg {holes[current_hole[0]]['target']}", "info")
                    else:
                        game_log.log(f"\nFERTIG! {total_strokes[0]} Schlaege", "header")
                        board_widget.canvas.unbind("<Button-1>")

            update_info()

        update_info()
        game_log.log(f"Loch 1: Triff Segment {holes[0]['target']}\n", "info")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_math(self):
        self.clear_frame()
        self._make_header("MATH DARTS")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        def gen_math():
            op = random.choice(["+", "-", "*"])
            if op == "+":
                a = random.randint(1, 12)
                b = random.randint(1, 8)
                answer = a + b
            elif op == "-":
                a = random.randint(5, 20)
                b = random.randint(1, a - 1)
                answer = a - b
            else:
                a = random.randint(1, 5)
                b = random.randint(1, 4)
                answer = a * b
            if answer > 20 or answer < 1:
                return gen_math()
            return f"{a} {op} {b}", answer

        total_problems = 8
        problem_num = [1]
        score = [0]
        darts_left = [3]
        eq, ans = gen_math()
        current = [eq, ans]

        math_frame = tk.Frame(right, bg=COLORS["card"])
        math_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(math_frame, text="KOPFRECHNEN", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        eq_label = tk.Label(math_frame, text=eq + " = ?", bg=COLORS["card"],
                            fg=COLORS["white"], font=("Arial", 22, "bold"))
        eq_label.pack(pady=10)

        answer_label = tk.Label(math_frame, text=f"Triff Segment: {ans}",
                                bg=COLORS["card"], fg=COLORS["yellow"],
                                font=("Arial", 14, "bold"))
        answer_label.pack(pady=5)

        info_label = tk.Label(right, text="", bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("MATH DARTS", "header")
        game_log.log("Loese die Aufgabe und triff die Antwort!\n")

        def update_info():
            info_label.config(
                text=f"Aufgabe {problem_num[0]}/{total_problems} | Score: {score[0]} | Darts: {darts_left[0]}"
            )

        def next_problem():
            problem_num[0] += 1
            if problem_num[0] > total_problems:
                game_log.log(f"\nFERTIG! Score: {score[0]}", "header")
                board_widget.canvas.unbind("<Button-1>")
                return
            eq, ans = gen_math()
            current[0], current[1] = eq, ans
            darts_left[0] = 3
            eq_label.config(text=eq + " = ?")
            answer_label.config(text=f"Triff Segment: {ans}")
            game_log.log(f"\nNaechste Aufgabe: {eq}", "info")
            update_info()

        def on_throw(result, points):
            if problem_num[0] > total_problems:
                return

            parts = result.split()
            hit_num = 0
            if len(parts) == 2:
                try:
                    hit_num = int(parts[1])
                except ValueError:
                    pass

            if hit_num == current[1]:
                bonus = darts_left[0] * 50
                earned = 100 + bonus
                score[0] += earned
                game_log.log(f"  {result} - RICHTIG! +{earned}", "hit")
                next_problem()
            else:
                darts_left[0] -= 1
                game_log.log(f"  {result} - Falsch!", "miss")
                if darts_left[0] <= 0:
                    game_log.log(f"  Antwort war: {current[1]}", "miss")
                    next_problem()

            update_info()

        update_info()
        game_log.log(f"Aufgabe: {eq}\n", "info")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_double_out(self):
        self.clear_frame()
        self._make_header("DOUBLE OUT TRAINING")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        doubles = list(range(1, 21))
        current_idx = [0]
        total_darts = [0]
        hits = [0]

        progress_frame = tk.Frame(right, bg=COLORS["card"])
        progress_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(progress_frame, text="DOUBLE OUT", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 12, "bold")).pack(pady=5)

        double_labels = {}
        grid = tk.Frame(progress_frame, bg=COLORS["card"])
        grid.pack(padx=10, pady=5)
        for i, d in enumerate(doubles):
            row, col = i // 5, i % 5
            lbl = tk.Label(grid, text=f"D{d}", bg=COLORS["card"],
                           fg=COLORS["muted"], font=("Arial", 10), width=5)
            lbl.grid(row=row, column=col, padx=2, pady=2)
            double_labels[d] = lbl

        double_labels[doubles[0]].config(fg=COLORS["yellow"], font=("Arial", 10, "bold"))

        info_label = tk.Label(right, text="", bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("DOUBLE OUT TRAINING", "header")
        game_log.log("Triff D1 bis D20!\n")

        def update_info():
            if current_idx[0] < len(doubles):
                info_label.config(
                    text=f"Ziel: D{doubles[current_idx[0]]} | Darts: {total_darts[0]} | Treffer: {hits[0]}"
                )

        def on_throw(result, points):
            if current_idx[0] >= len(doubles):
                return

            total_darts[0] += 1
            target = doubles[current_idx[0]]

            parts = result.split()
            hit_num = 0
            is_double = False
            if len(parts) == 2 and parts[0] == "Double":
                try:
                    hit_num = int(parts[1])
                    is_double = True
                except ValueError:
                    pass

            if is_double and hit_num == target:
                hits[0] += 1
                double_labels[target].config(fg=COLORS["green"])
                game_log.log(f"  {result} - TREFFER!", "hit")
                current_idx[0] += 1
                if current_idx[0] < len(doubles):
                    next_d = doubles[current_idx[0]]
                    double_labels[next_d].config(fg=COLORS["yellow"], font=("Arial", 10, "bold"))
                else:
                    game_log.log(f"\nALLE DOUBLES! {total_darts[0]} Darts", "header")
                    board_widget.canvas.unbind("<Button-1>")
            else:
                game_log.log(f"  {result} - daneben", "miss")

            update_info()

        update_info()

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_triple_challenge(self):
        self.clear_frame()
        self._make_header("TRIPLE CHALLENGE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        total_darts = 30
        darts_left = [total_darts]
        triples_hit = [0]
        total_score = [0]

        info_frame = tk.Frame(right, bg=COLORS["card"])
        info_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(info_frame, text="TRIPLE CHALLENGE", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        darts_label = tk.Label(info_frame, text=f"Darts: {total_darts}", bg=COLORS["card"],
                               fg=COLORS["yellow"], font=("Arial", 16, "bold"))
        darts_label.pack(pady=3)

        triples_label = tk.Label(info_frame, text="Triples: 0", bg=COLORS["card"],
                                 fg=COLORS["green"], font=("Arial", 14, "bold"))
        triples_label.pack(pady=3)

        score_label = tk.Label(info_frame, text="Score: 0", bg=COLORS["card"],
                               fg=COLORS["fg"], font=("Arial", 12))
        score_label.pack(pady=3)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("TRIPLE CHALLENGE", "header")
        game_log.log("30 Darts - Triff so viele Triples wie moeglich!\n")

        def on_throw(result, points):
            if darts_left[0] <= 0:
                return

            darts_left[0] -= 1
            total_score[0] += points

            if "Triple" in result:
                triples_hit[0] += 1
                game_log.log(f"  {result} ({points}) - TRIPLE!", "hit")
            else:
                game_log.log(f"  {result} ({points})", "miss")

            darts_label.config(text=f"Darts: {darts_left[0]}")
            triples_label.config(text=f"Triples: {triples_hit[0]}")
            score_label.config(text=f"Score: {total_score[0]}")

            if darts_left[0] <= 0:
                pct = triples_hit[0] / total_darts * 100
                game_log.log(f"\nFERTIG! {triples_hit[0]} Triples ({pct:.0f}%)", "header")
                game_log.log(f"Score: {total_score[0]}", "info")
                board_widget.canvas.unbind("<Button-1>")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_target_practice(self):
        self.clear_frame()
        self._make_header("TARGET PRACTICE")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)

        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=10, pady=10)

        targets = [
            ("Single 20", 20, "single"), ("Double 20", 20, "double"),
            ("Triple 20", 20, "triple"), ("Single 19", 19, "single"),
            ("Double 19", 19, "double"), ("Triple 19", 19, "triple"),
            ("Bull", 25, "bull"), ("Bullseye", 50, "bullseye"),
            ("Single 18", 18, "single"), ("Double 18", 18, "double"),
        ]
        random.shuffle(targets)
        targets = targets[:8]

        current_idx = [0]
        hits = [0]
        total_darts = [0]

        target_frame = tk.Frame(right, bg=COLORS["card"])
        target_frame.pack(fill=tk.X, pady=5, padx=5)

        tk.Label(target_frame, text="ZIELTRAINING", bg=COLORS["card"],
                 fg=COLORS["accent"], font=("Arial", 14, "bold")).pack(pady=5)

        target_display = tk.Label(target_frame, text=targets[0][0],
                                  bg=COLORS["card"], fg=COLORS["yellow"],
                                  font=("Arial", 20, "bold"))
        target_display.pack(pady=10)

        progress_label = tk.Label(target_frame, text="Ziel 1/8",
                                  bg=COLORS["card"], fg=COLORS["fg"], font=("Arial", 11))
        progress_label.pack(pady=3)

        info_label = tk.Label(right, text="Darts: 0 | Treffer: 0/8",
                              bg=COLORS["bg"], fg=COLORS["yellow"],
                              font=("Arial", 12, "bold"))
        info_label.pack(pady=5)

        game_log = GameLog(right)
        game_log.pack(fill=tk.BOTH, expand=True)
        game_log.log("TARGET PRACTICE", "header")
        game_log.log(f"Triff: {targets[0][0]}\n", "info")

        def check_hit(result, target):
            name, num, ttype = target
            if ttype == "bullseye":
                return result == "Bullseye"
            if ttype == "bull":
                return result in ("Bull", "Bullseye")
            parts = result.split()
            if len(parts) != 2:
                return False
            try:
                hit_num = int(parts[1])
            except ValueError:
                return False
            if hit_num != num:
                return False
            if ttype == "double":
                return parts[0] == "Double"
            if ttype == "triple":
                return parts[0] == "Triple"
            return ttype == "single" and parts[0] not in ("Double", "Triple")

        def on_throw(result, points):
            if current_idx[0] >= len(targets):
                return

            total_darts[0] += 1
            target = targets[current_idx[0]]

            if check_hit(result, target):
                hits[0] += 1
                game_log.log(f"  {result} - TREFFER!", "hit")
                current_idx[0] += 1
                if current_idx[0] < len(targets):
                    next_t = targets[current_idx[0]]
                    target_display.config(text=next_t[0])
                    progress_label.config(text=f"Ziel {current_idx[0]+1}/{len(targets)}")
                    game_log.log(f"  Naechstes Ziel: {next_t[0]}", "info")
                else:
                    game_log.log(f"\nALLE ZIELE! {total_darts[0]} Darts, {hits[0]} Treffer", "header")
                    target_display.config(text="FERTIG!")
                    board_widget.canvas.unbind("<Button-1>")
            else:
                game_log.log(f"  {result} - daneben", "miss")

            info_label.config(text=f"Darts: {total_darts[0]} | Treffer: {hits[0]}/{len(targets)}")

        board_widget = DartBoardCanvas(left, size=420, on_throw=on_throw)
        board_widget.pack(pady=5)

        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)

        def sim():
            r, p = board_widget.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="🎯 Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="← Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_killer(self):
        self.clear_frame()
        self._make_header("KILLER")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {
            "players": {},
            "order": [],
            "current_idx": 0,
            "dart": 0,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)
        import random as rnd

        def update_display():
            lines = []
            for n in state["order"]:
                p = state["players"][n]
                if not p["alive"]:
                    lines.append(f"  {n}: AUSGESCHIEDEN")
                    continue
                hearts = "V" * p["lives"] + "." * (3 - p["lives"])
                killer = " [KILLER]" if p["is_killer"] else ""
                lines.append(f"  {n}: {hearts} D{p['number']}{killer}")
            if state["started"]:
                alive = [n for n in state["order"] if state["players"][n]["alive"]]
                if alive:
                    cur = alive[state["current_idx"] % len(alive)]
                    lines.append(f"\n  Am Zug: {cur} (Dart {state['dart']+1}/3)")
            status_lbl.config(text="\n".join(lines))

        def start_game():
            names = name_entry.get().strip()
            if not names:
                names = "Spieler 1,Spieler 2,Spieler 3"
            plist = [n.strip() for n in names.split(",") if n.strip()]
            if len(plist) < 2:
                plist = ["Spieler 1", "Spieler 2", "Spieler 3"]
            segs = rnd.sample(range(1, 21), min(len(plist), 20))
            state["order"] = plist
            for i, n in enumerate(plist):
                state["players"][n] = {
                    "number": segs[i], "lives": 3,
                    "is_killer": False, "alive": True,
                }
            state["started"] = True
            state["current_idx"] = 0
            state["dart"] = 0
            log.clear()
            log.add(f"Killer gestartet mit {len(plist)} Spielern!", "info")
            for n in plist:
                log.add(f"  {n}: Ziel = D{state['players'][n]['number']}", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler (kommagetrennt):", bg=COLORS["panel"],
                 fg=COLORS["text"]).pack(pady=2)
        name_entry = tk.Entry(setup_frame, width=30)
        name_entry.insert(0, "Alice,Bob,Charlie")
        name_entry.pack(pady=2)
        ttk.Button(setup_frame, text="Spiel starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            alive = [n for n in state["order"] if state["players"][n]["alive"]]
            if len(alive) <= 1:
                if alive:
                    log.add(f"{alive[0]} GEWINNT KILLER!", "success")
                else:
                    log.add("KILLER beendet - alle eliminiert!", "success")
                state["started"] = False
                return
            cur = alive[state["current_idx"] % len(alive)]
            p = state["players"][cur]
            hit_num, hit_type = parse_hit_number(result)
            log.add(f"{cur}: {result} ({points})", "hit" if hit_type == "double" else "miss")
            if hit_type == "double":
                if hit_num == p["number"] and not p["is_killer"]:
                    p["is_killer"] = True
                    log.add(f"  {cur} ist jetzt KILLER!", "success")
                elif p["is_killer"]:
                    for vn, vd in state["players"].items():
                        if vn != cur and vd["alive"] and vd["number"] == hit_num:
                            vd["lives"] -= 1
                            log.add(f"  {vn} verliert ein Leben! ({vd['lives']})", "warning")
                            if vd["lives"] <= 0:
                                vd["alive"] = False
                                log.add(f"  {vn} ist AUSGESCHIEDEN!", "miss")
                            break
            state["dart"] += 1
            if state["dart"] >= 3:
                state["dart"] = 0
                state["current_idx"] = (state["current_idx"] + 1) % len(alive)
                alive2 = [n for n in state["order"] if state["players"][n]["alive"]]
                if len(alive2) == 1:
                    log.add(f"{alive2[0]} GEWINNT KILLER!", "success")
                    state["started"] = False
                elif len(alive2) == 0:
                    log.add("Alle ausgeschieden!", "info")
                    state["started"] = False
                else:
                    state["current_idx"] = state["current_idx"] % len(alive2)
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_lucky_number(self):
        self.clear_frame()
        self._make_header("LUCKY NUMBER")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import random as rnd
        state = {
            "players": [],
            "scores": {},
            "round": 1,
            "max_rounds": 8,
            "current_idx": 0,
            "dart": 0,
            "lucky": 0,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def new_lucky():
            state["lucky"] = rnd.randint(1, 20)

        def update_display():
            lines = [f"  Runde {state['round']}/{state['max_rounds']}"]
            lines.append(f"  Glueckszahl: {state['lucky']}")
            for n in state["players"]:
                lines.append(f"  {n}: {state['scores'].get(n, 0)} Punkte")
            if state["started"]:
                cur = state["players"][state["current_idx"] % len(state["players"])]
                lines.append(f"\n  Am Zug: {cur} (Dart {state['dart']+1}/3)")
            status_lbl.config(text="\n".join(lines))

        def start_game():
            names = name_entry.get().strip()
            if not names:
                names = "Spieler 1,Spieler 2"
            plist = [n.strip() for n in names.split(",") if n.strip()]
            if len(plist) < 2:
                plist = ["Spieler 1", "Spieler 2"]
            state["players"] = plist
            state["scores"] = {n: 0 for n in plist}
            state["started"] = True
            state["round"] = 1
            state["current_idx"] = 0
            state["dart"] = 0
            new_lucky()
            log.clear()
            log.add("Lucky Number gestartet!", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler (kommagetrennt):", bg=COLORS["panel"],
                 fg=COLORS["text"]).pack(pady=2)
        name_entry = tk.Entry(setup_frame, width=30)
        name_entry.insert(0, "Alice,Bob")
        name_entry.pack(pady=2)
        ttk.Button(setup_frame, text="Spiel starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            cur = state["players"][state["current_idx"] % len(state["players"])]
            hit_num, hit_type = parse_hit_number(result)
            earned = 0
            if hit_num == state["lucky"]:
                mult = {"triple": 3, "double": 2}.get(hit_type, 1)
                earned = state["lucky"] * mult * 2
                log.add(f"{cur}: {result} - GLUECKSZAHL! +{earned}", "success")
            elif points > 0:
                earned = points
                log.add(f"{cur}: {result} ({points})", "hit")
            else:
                log.add(f"{cur}: {result} - Daneben", "miss")
            state["scores"][cur] = state["scores"].get(cur, 0) + earned
            state["dart"] += 1
            if state["dart"] >= 3:
                state["dart"] = 0
                state["current_idx"] += 1
                if state["current_idx"] >= len(state["players"]):
                    state["current_idx"] = 0
                    state["round"] += 1
                    new_lucky()
                    if state["round"] > state["max_rounds"]:
                        winner = max(state["scores"], key=state["scores"].get)
                        log.add(f"SPIEL VORBEI! {winner} gewinnt!", "success")
                        for n in state["players"]:
                            log.add(f"  {n}: {state['scores'][n]}", "info")
                        state["started"] = False
                    else:
                        log.add(f"Runde {state['round']}: Glueckszahl = {state['lucky']}", "info")
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_poker(self):
        self.clear_frame()
        self._make_header("DART POKER")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {
            "players": [],
            "scores": {},
            "round": 1,
            "max_rounds": 5,
            "current_idx": 0,
            "dart": 0,
            "hands": {},
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def evaluate_hand(hits):
            from collections import Counter
            nums = [h[0] for h in hits]
            types = [h[1] for h in hits]
            valid_nums = [n for n in nums if n > 0]
            c = Counter(valid_nums)
            pairs = sum(1 for v in c.values() if v >= 2)
            trips = sum(1 for v in c.values() if v >= 3)
            has_triple = "triple" in types
            has_double = "double" in types
            total = sum(n for n in nums)
            bonus = 0
            hand_name = "Nichts"
            if trips:
                hand_name = "Drilling"
                bonus = 100
            elif pairs >= 2:
                hand_name = "Zwei Paare"
                bonus = 75
            elif pairs == 1:
                hand_name = "Ein Paar"
                bonus = 30
            if has_triple and has_double:
                hand_name = "Full House"
                bonus = 150
            elif len(valid_nums) == 3 and sorted(valid_nums) == list(range(min(valid_nums), min(valid_nums)+3)):
                hand_name = "Strasse"
                bonus = 120
            return hand_name, total + bonus

        def update_display():
            lines = [f"  Runde {state['round']}/{state['max_rounds']}"]
            for n in state["players"]:
                lines.append(f"  {n}: {state['scores'].get(n, 0)} Punkte")
                hand = state["hands"].get(n, [])
                if hand:
                    hstr = ", ".join(f"{h[1][0].upper()}{h[0]}" for h in hand)
                    lines.append(f"    Hand: [{hstr}]")
            if state["started"]:
                cur = state["players"][state["current_idx"] % len(state["players"])]
                lines.append(f"\n  Am Zug: {cur} (Dart {state['dart']+1}/3)")
            status_lbl.config(text="\n".join(lines))

        def start_game():
            names = name_entry.get().strip()
            if not names:
                names = "Spieler 1,Spieler 2"
            plist = [n.strip() for n in names.split(",") if n.strip()]
            if len(plist) < 2:
                plist = ["Spieler 1", "Spieler 2"]
            state["players"] = plist
            state["scores"] = {n: 0 for n in plist}
            state["hands"] = {n: [] for n in plist}
            state["started"] = True
            state["round"] = 1
            state["current_idx"] = 0
            state["dart"] = 0
            log.clear()
            log.add("Dart Poker gestartet!", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler (kommagetrennt):", bg=COLORS["panel"],
                 fg=COLORS["text"]).pack(pady=2)
        name_entry = tk.Entry(setup_frame, width=30)
        name_entry.insert(0, "Alice,Bob")
        name_entry.pack(pady=2)
        ttk.Button(setup_frame, text="Spiel starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            cur = state["players"][state["current_idx"] % len(state["players"])]
            hit_num, hit_type = parse_hit_number(result)
            state["hands"][cur].append((hit_num, hit_type))
            log.add(f"{cur}: {result} ({points})", "hit" if points > 0 else "miss")
            state["dart"] += 1
            if state["dart"] >= 3:
                hand_name, hand_score = evaluate_hand(state["hands"][cur])
                log.add(f"  Hand: {hand_name} = {hand_score} Punkte", "info")
                state["scores"][cur] += hand_score
                state["hands"][cur] = []
                state["dart"] = 0
                state["current_idx"] += 1
                if state["current_idx"] >= len(state["players"]):
                    state["current_idx"] = 0
                    state["round"] += 1
                    if state["round"] > state["max_rounds"]:
                        winner = max(state["scores"], key=state["scores"].get)
                        log.add(f"SPIEL VORBEI! {winner} gewinnt!", "success")
                        for n in state["players"]:
                            log.add(f"  {n}: {state['scores'][n]}", "info")
                        state["started"] = False
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_bingo(self):
        self.clear_frame()
        self._make_header("DART BINGO")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import random as rnd
        state = {
            "card": [],
            "marked": [],
            "darts": 0,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        card_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                            font=("Courier", 12), justify=tk.LEFT, anchor="w")
        card_lbl.pack(fill=tk.X, padx=8, pady=5)

        def update_card():
            lines = ["  BINGO-KARTE (5x5):\n"]
            for r in range(5):
                row_str = "  "
                for c in range(5):
                    idx = r * 5 + c
                    if idx == 12:
                        row_str += " [X] "
                    elif idx in state["marked"]:
                        row_str += f" [X] "
                    else:
                        row_str += f" {state['card'][idx]:>2}  "
                lines.append(row_str)
            lines.append(f"\n  Darts: {state['darts']}")
            bingo_count = check_bingo()
            lines.append(f"  Bingos: {bingo_count}")
            card_lbl.config(text="\n".join(lines))

        def check_bingo():
            marked_set = set(state["marked"])
            marked_set.add(12)
            count = 0
            for r in range(5):
                if all((r * 5 + c) in marked_set for c in range(5)):
                    count += 1
            for c in range(5):
                if all((r * 5 + c) in marked_set for r in range(5)):
                    count += 1
            if all((i * 5 + i) in marked_set for i in range(5)):
                count += 1
            if all((i * 5 + (4 - i)) in marked_set for i in range(5)):
                count += 1
            return count

        def start_bingo():
            nums = rnd.sample(range(1, 61), 24)
            state["card"] = nums[:12] + [0] + nums[12:]
            state["marked"] = []
            state["darts"] = 0
            state["started"] = True
            log.clear()
            log.add("Bingo gestartet! Triff Zahlen auf der Karte.", "info")
            log.add("Mitte ist frei. Ziel: komplette Reihen!", "info")
            setup_btn.pack_forget()
            update_card()

        setup_btn = ttk.Button(right, text="Neues Bingo-Spiel", command=start_bingo)
        setup_btn.pack(pady=10)

        def on_throw(result, points):
            if not state["started"]:
                return
            state["darts"] += 1
            hit_num, _ = parse_hit_number(result)
            found = False
            for idx, val in enumerate(state["card"]):
                if val == points and idx not in state["marked"] and idx != 12:
                    state["marked"].append(idx)
                    log.add(f"Dart {state['darts']}: {result} ({points}) - TREFFER!", "success")
                    found = True
                    break
            if not found:
                for idx, val in enumerate(state["card"]):
                    if val == hit_num and idx not in state["marked"] and idx != 12:
                        state["marked"].append(idx)
                        log.add(f"Dart {state['darts']}: {result} ({points}) - {hit_num} markiert!", "hit")
                        found = True
                        break
            if not found:
                log.add(f"Dart {state['darts']}: {result} ({points}) - Nicht auf Karte", "miss")
            bc = check_bingo()
            if bc >= 1:
                log.add(f"BINGO! {bc} Linie(n) komplett in {state['darts']} Darts!", "success")
                state["started"] = False
            update_card()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_speed_darts(self):
        self.clear_frame()
        self._make_header("SPEED DARTS")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import time as _time
        import random as rnd
        state = {
            "target": 0,
            "score": 0,
            "darts": 0,
            "max_darts": 20,
            "hits": 0,
            "start_time": 0,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="Klicke Start um zu beginnen",
                              bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 14, "bold"), justify=tk.LEFT)
        status_lbl.pack(fill=tk.X, padx=8, pady=10)

        def new_target():
            state["target"] = rnd.randint(1, 20)
            status_lbl.config(text=f"  ZIEL: {state['target']}\n"
                                   f"  Darts: {state['darts']}/{state['max_darts']}\n"
                                   f"  Treffer: {state['hits']}  Punkte: {state['score']}")

        def start_speed():
            state["score"] = 0
            state["darts"] = 0
            state["hits"] = 0
            state["start_time"] = _time.time()
            state["started"] = True
            log.clear()
            log.add("Speed Darts! Triff die Zielzahlen so schnell wie moeglich!", "info")
            new_target()

        ttk.Button(btn_frame, text="Start", command=start_speed).pack(side=tk.LEFT, padx=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            state["darts"] += 1
            if hit_num == state["target"]:
                mult = {"triple": 3, "double": 2}.get(hit_type, 1)
                earned = state["target"] * mult
                state["score"] += earned
                state["hits"] += 1
                elapsed = _time.time() - state["start_time"]
                log.add(f"Dart {state['darts']}: {result} - TREFFER! +{earned} ({elapsed:.1f}s)", "success")
                new_target()
            else:
                log.add(f"Dart {state['darts']}: {result} - Daneben (Ziel: {state['target']})", "miss")
            if state["darts"] >= state["max_darts"]:
                elapsed = _time.time() - state["start_time"]
                state["started"] = False
                log.add(f"FERTIG! {state['hits']} Treffer, {state['score']} Punkte in {elapsed:.1f}s", "success")
                status_lbl.config(text=f"  FERTIG!\n  Treffer: {state['hits']}/{state['max_darts']}\n"
                                       f"  Punkte: {state['score']}\n  Zeit: {elapsed:.1f}s")

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_combos(self):
        self.clear_frame()
        self._make_header("KOMBO-CHALLENGE")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {
            "score": 0,
            "streak": 0,
            "best_streak": 0,
            "round": 1,
            "dart": 0,
            "max_rounds": 10,
            "last_type": None,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 12), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def update_display():
            streak_bar = "|" * state["streak"]
            lines = [
                f"  Runde {state['round']}/{state['max_rounds']}",
                f"  Punkte: {state['score']}",
                f"  Streak: {state['streak']} {streak_bar}",
                f"  Beste Streak: {state['best_streak']}",
                f"  Dart {state['dart']+1}/3",
            ]
            status_lbl.config(text="\n".join(lines))

        state["started"] = True
        log.add("Kombo-Challenge! Triff verschiedene Typen hintereinander!", "info")
        log.add("Single->Double->Triple = Kombo-Bonus!", "info")
        update_display()

        def on_throw(result, points):
            if not state["started"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            if hit_type in ("single", "double", "triple"):
                if state["last_type"] != hit_type:
                    state["streak"] += 1
                    bonus = state["streak"] * 5
                    earned = points + bonus
                    state["score"] += earned
                    log.add(f"R{state['round']}: {result} ({points}+{bonus} Streak)", "success")
                else:
                    state["streak"] = 1
                    state["score"] += points
                    log.add(f"R{state['round']}: {result} ({points}) Streak reset", "warning")
                state["last_type"] = hit_type
            else:
                state["streak"] = 0
                state["last_type"] = None
                state["score"] += points
                log.add(f"R{state['round']}: {result} ({points})", "miss")
            state["best_streak"] = max(state["best_streak"], state["streak"])
            state["dart"] += 1
            if state["dart"] >= 3:
                state["dart"] = 0
                state["round"] += 1
                if state["round"] > state["max_rounds"]:
                    state["started"] = False
                    log.add(f"FERTIG! {state['score']} Punkte, Beste Streak: {state['best_streak']}", "success")
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_endurance(self):
        self.clear_frame()
        self._make_header("ENDURANCE")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {
            "hp": 100,
            "score": 0,
            "round": 1,
            "dart": 0,
            "round_score": 0,
            "threshold": 15,
            "started": True,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 12), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def update_display():
            hp_bar_len = 20
            filled = max(0, int(state["hp"] / 100 * hp_bar_len))
            bar = "#" * filled + "." * (hp_bar_len - filled)
            lines = [
                f"  Runde {state['round']}",
                f"  HP: [{bar}] {state['hp']}/100",
                f"  Punkte: {state['score']}",
                f"  Mindestpunktzahl: {state['threshold']}",
                f"  Dart {state['dart']+1}/3",
            ]
            status_lbl.config(text="\n".join(lines))

        log.add("Endurance! Ueberlebe so lange wie moeglich!", "info")
        log.add(f"Pro Runde mindestens {state['threshold']} Punkte oder HP-Verlust!", "info")
        update_display()

        def on_throw(result, points):
            if not state["started"]:
                return
            state["score"] += points
            state["round_score"] += points
            log.add(f"R{state['round']} D{state['dart']+1}: {result} ({points})", "hit" if points > 0 else "miss")
            state["dart"] += 1
            if state["dart"] >= 3:
                round_total = state["round_score"]
                if round_total < state["threshold"]:
                    damage = max(5, state["threshold"] - round_total)
                    state["hp"] -= damage
                    log.add(f"  Runde schwach! -{damage} HP", "warning")
                else:
                    heal = min(5, 100 - state["hp"])
                    state["hp"] += heal
                    if heal > 0:
                        log.add(f"  Gute Runde! +{heal} HP", "success")
                state["dart"] = 0
                state["round_score"] = 0
                state["round"] += 1
                state["threshold"] = min(state["threshold"] + 2, 60)
                if state["hp"] <= 0:
                    state["hp"] = 0
                    state["started"] = False
                    log.add(f"GAME OVER! {state['round']-1} Runden, {state['score']} Punkte", "miss")
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_survival(self):
        self.clear_frame()
        self._make_header("SURVIVAL")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import random as rnd
        state = {
            "wave": 1,
            "enemies": 0,
            "enemies_killed": 0,
            "hp": 50,
            "score": 0,
            "darts_left": 0,
            "started": False,
            "total_kills": 0,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 12), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def new_wave():
            state["enemies"] = 2 + state["wave"]
            state["enemies_killed"] = 0
            state["darts_left"] = state["enemies"] + 2
            log.add(f"Welle {state['wave']}: {state['enemies']} Feinde! ({state['darts_left']} Darts)", "warning")

        def update_display():
            hp_bar_len = 15
            filled = max(0, int(state["hp"] / 50 * hp_bar_len))
            bar = "#" * filled + "." * (hp_bar_len - filled)
            lines = [
                f"  Welle {state['wave']}",
                f"  HP: [{bar}] {state['hp']}/50",
                f"  Feinde: {state['enemies'] - state['enemies_killed']} uebrig",
                f"  Darts: {state['darts_left']}",
                f"  Kills: {state['total_kills']}  Score: {state['score']}",
            ]
            status_lbl.config(text="\n".join(lines))

        def start_survival():
            state["wave"] = 1
            state["hp"] = 50
            state["score"] = 0
            state["total_kills"] = 0
            state["started"] = True
            log.clear()
            log.add("Survival! Besiege Wellen von Feinden!", "info")
            new_wave()
            update_display()

        ttk.Button(btn_frame, text="Start", command=start_survival).pack(side=tk.LEFT, padx=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            state["darts_left"] -= 1
            hit_num, hit_type = parse_hit_number(result)
            kill_threshold = 10 + state["wave"] * 3
            if points >= kill_threshold:
                state["enemies_killed"] += 1
                state["total_kills"] += 1
                state["score"] += points * 2
                log.add(f"  {result} ({points}) - Feind besiegt!", "success")
            elif points > 0:
                state["score"] += points
                log.add(f"  {result} ({points}) - Nicht genug Schaden (brauche {kill_threshold})", "warning")
            else:
                log.add(f"  {result} - Daneben!", "miss")
            remaining = state["enemies"] - state["enemies_killed"]
            if remaining <= 0:
                bonus = state["wave"] * 10
                state["score"] += bonus
                log.add(f"Welle {state['wave']} geschafft! +{bonus} Bonus", "success")
                state["wave"] += 1
                new_wave()
            elif state["darts_left"] <= 0:
                damage = remaining * 5
                state["hp"] -= damage
                log.add(f"{remaining} Feinde erreichen dich! -{damage} HP", "miss")
                if state["hp"] <= 0:
                    state["hp"] = 0
                    state["started"] = False
                    log.add(f"GAME OVER! Welle {state['wave']}, {state['total_kills']} Kills, {state['score']} Punkte", "miss")
                else:
                    state["wave"] += 1
                    new_wave()
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_reaction(self):
        self.clear_frame()
        self._make_header("REAKTIONSTEST")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import time as _time
        import random as rnd
        state = {
            "target": 0,
            "round": 0,
            "max_rounds": 10,
            "score": 0,
            "target_time": 0,
            "started": False,
            "waiting": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        target_lbl = tk.Label(info, text="Klicke Start!", bg=COLORS["panel"],
                              fg=COLORS["accent"], font=("Arial", 20, "bold"))
        target_lbl.pack(pady=10)
        stats_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                             font=("Courier", 11))
        stats_lbl.pack(pady=5)

        def show_new_target():
            state["round"] += 1
            if state["round"] > state["max_rounds"]:
                state["started"] = False
                avg = state["score"] / state["max_rounds"] if state["max_rounds"] > 0 else 0
                target_lbl.config(text="FERTIG!", fg=COLORS["green"])
                log.add(f"Test vorbei! Durchschnitt: {avg:.0f} Punkte/Runde", "success")
                stats_lbl.config(text=f"Gesamt: {state['score']} Punkte")
                return
            state["target"] = rnd.randint(1, 20)
            state["target_time"] = _time.time()
            target_lbl.config(text=f"ZIEL: {state['target']}", fg=COLORS["accent"])
            stats_lbl.config(text=f"Runde {state['round']}/{state['max_rounds']} | Score: {state['score']}")

        def start_reaction():
            state["round"] = 0
            state["score"] = 0
            state["started"] = True
            log.clear()
            log.add("Reaktionstest! Triff das Ziel so schnell wie moeglich!", "info")
            show_new_target()

        ttk.Button(btn_frame, text="Start", command=start_reaction).pack(side=tk.LEFT, padx=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            reaction = _time.time() - state["target_time"]
            if hit_num == state["target"]:
                time_bonus = max(0, int(50 - reaction * 10))
                mult = {"triple": 3, "double": 2}.get(hit_type, 1)
                earned = state["target"] * mult + time_bonus
                state["score"] += earned
                log.add(f"R{state['round']}: {result} TREFFER! +{earned} ({reaction:.1f}s)", "success")
                show_new_target()
            else:
                log.add(f"R{state['round']}: {result} - Daneben! (Ziel: {state['target']})", "miss")

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_assassin(self):
        self.clear_frame()
        self._make_header("DART ASSASSIN")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import random as rnd
        state = {
            "players": {},
            "order": [],
            "targets": {},
            "current_idx": 0,
            "dart": 0,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def assign_targets():
            alive = [n for n in state["order"] if state["players"][n]["alive"]]
            rnd.shuffle(alive)
            for i, n in enumerate(alive):
                state["targets"][n] = alive[(i + 1) % len(alive)]

        def update_display():
            lines = []
            for n in state["order"]:
                p = state["players"][n]
                if not p["alive"]:
                    lines.append(f"  {n}: ELIMINIERT")
                    continue
                hearts = "V" * p["lives"] + "." * (3 - p["lives"])
                shield = " [SCHILD]" if p["shield"] else ""
                target = state["targets"].get(n, "?")
                lines.append(f"  {n}: {hearts} -> {target}{shield}")
            alive = [n for n in state["order"] if state["players"][n]["alive"]]
            if state["started"] and alive:
                cur = alive[state["current_idx"] % len(alive)]
                lines.append(f"\n  Am Zug: {cur} (Dart {state['dart']+1}/3)")
            status_lbl.config(text="\n".join(lines))

        def start_game():
            names = name_entry.get().strip()
            if not names:
                names = "Agent A,Agent B,Agent C,Agent D"
            plist = [n.strip() for n in names.split(",") if n.strip()]
            if len(plist) < 3:
                plist = ["Agent A", "Agent B", "Agent C"]
            segs = rnd.sample(range(1, 21), min(len(plist), 20))
            state["order"] = plist
            for i, n in enumerate(plist):
                state["players"][n] = {
                    "segment": segs[i], "lives": 3,
                    "alive": True, "shield": False,
                }
            assign_targets()
            state["started"] = True
            state["current_idx"] = 0
            state["dart"] = 0
            log.clear()
            log.add("Assassin gestartet!", "info")
            for n in plist:
                log.add(f"  {n}: Segment {state['players'][n]['segment']}, Ziel: {state['targets'][n]}", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler (kommagetrennt):", bg=COLORS["panel"],
                 fg=COLORS["text"]).pack(pady=2)
        name_entry = tk.Entry(setup_frame, width=30)
        name_entry.insert(0, "Agent A,Agent B,Agent C,Agent D")
        name_entry.pack(pady=2)
        ttk.Button(setup_frame, text="Spiel starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            alive = [n for n in state["order"] if state["players"][n]["alive"]]
            if len(alive) <= 1:
                return
            cur = alive[state["current_idx"] % len(alive)]
            target_name = state["targets"].get(cur, "")
            hit_num, hit_type = parse_hit_number(result)
            log.add(f"{cur}: {result} ({points})", "hit" if points > 0 else "miss")
            if target_name and target_name in state["players"]:
                tp = state["players"][target_name]
                if hit_type == "double" and hit_num == tp["segment"]:
                    if tp["shield"]:
                        tp["shield"] = False
                        log.add(f"  {target_name}s Schild blockt!", "warning")
                    else:
                        tp["lives"] -= 1
                        log.add(f"  {target_name} getroffen! ({tp['lives']} Leben)", "warning")
                        if tp["lives"] <= 0:
                            tp["alive"] = False
                            log.add(f"  {target_name} ELIMINIERT!", "miss")
                            assign_targets()
                elif hit_type == "triple" and hit_num == tp["segment"]:
                    if tp["shield"]:
                        tp["shield"] = False
                        log.add(f"  {target_name}s Schild blockt Triple!", "warning")
                    else:
                        tp["lives"] -= 2
                        log.add(f"  Triple-Kill! {target_name} -2 Leben ({max(0,tp['lives'])})", "success")
                        if tp["lives"] <= 0:
                            tp["alive"] = False
                            log.add(f"  {target_name} ELIMINIERT!", "miss")
                            assign_targets()
                elif hit_num == state["players"][cur]["segment"]:
                    state["players"][cur]["shield"] = True
                    log.add(f"  {cur} aktiviert Schild!", "info")
            state["dart"] += 1
            if state["dart"] >= 3:
                state["dart"] = 0
                alive2 = [n for n in state["order"] if state["players"][n]["alive"]]
                if len(alive2) <= 1:
                    if alive2:
                        log.add(f"{alive2[0]} GEWINNT ASSASSIN!", "success")
                    else:
                        log.add("ASSASSIN beendet - alle eliminiert!", "success")
                    state["started"] = False
                else:
                    state["current_idx"] = (state["current_idx"] + 1) % len(alive2)
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_countdown(self):
        self.clear_frame()
        self._make_header("COUNTDOWN")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {"score": 501, "darts": 0, "round": 1, "dart_in_round": 0, "started": True}
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        score_lbl = tk.Label(info, text="501", bg=COLORS["panel"], fg=COLORS["accent"],
                             font=("Arial", 36, "bold"))
        score_lbl.pack(pady=10)
        detail_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11))
        detail_lbl.pack(pady=5)

        def update_display():
            score_lbl.config(text=str(state["score"]))
            detail_lbl.config(text=f"Runde {state['round']} | Dart {state['dart_in_round']+1}/3 | "
                                   f"Gesamt: {state['darts']} Darts")

        log.add("Countdown von 501! Erreiche genau 0.", "info")
        log.add("Letzter Dart muss ein Double sein!", "info")
        update_display()

        def on_throw(result, points):
            if not state["started"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            new_score = state["score"] - points
            state["darts"] += 1
            if new_score < 0 or new_score == 1:
                log.add(f"R{state['round']}: {result} ({points}) - BUST! Bleibt bei {state['score']}", "warning")
            elif new_score == 0:
                if hit_type == "double" or result == "Bullseye":
                    state["score"] = 0
                    state["started"] = False
                    log.add(f"R{state['round']}: {result} ({points}) - AUSGECHECKT!", "success")
                    log.add(f"Geschafft in {state['darts']} Darts!", "success")
                    score_lbl.config(text="0", fg=COLORS["green"])
                else:
                    log.add(f"R{state['round']}: {result} ({points}) - Brauche Double zum Auschecken!", "warning")
            else:
                state["score"] = new_score
                log.add(f"R{state['round']}: {result} ({points}) -> {state['score']}", "hit")
            state["dart_in_round"] += 1
            if state["dart_in_round"] >= 3:
                state["dart_in_round"] = 0
                state["round"] += 1
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_trivia(self):
        self.clear_frame()
        self._make_header("DART TRIVIA")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        questions = [
            ("Hoechster Single-Wurf?", 20), ("Punkte fuer Bullseye?", 50),
            ("Segmente auf der Dartscheibe?", 20), ("Punkte fuer Triple 20?", 60),
            ("Punkte fuer Double 20?", 40), ("Startpunktzahl im Standard?", 501),
            ("Triple 19 Punkte?", 57), ("Double 16 Punkte?", 32),
            ("Bull (Outer) Punkte?", 25), ("Hoechster 3-Dart-Finish?", 170),
        ]
        import random as rnd
        rnd.shuffle(questions)
        state = {"q_idx": 0, "score": 0, "started": True}
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        q_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["accent"],
                         font=("Arial", 14, "bold"), wraplength=300)
        q_lbl.pack(pady=10)
        hint_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["muted"],
                            font=("Courier", 10))
        hint_lbl.pack(pady=5)

        def show_question():
            if state["q_idx"] >= len(questions):
                state["started"] = False
                q_lbl.config(text=f"FERTIG! {state['score']}/{len(questions)}")
                hint_lbl.config(text="")
                return
            q, a = questions[state["q_idx"]]
            q_lbl.config(text=f"Frage {state['q_idx']+1}: {q}")
            hint_lbl.config(text=f"Antwort mit Punktzahl: Triff {a} Punkte!")

        log.add("Dart Trivia! Beantworte Fragen durch Werfen!", "info")
        log.add("Triff die richtige Punktzahl als Antwort!", "info")
        show_question()

        def on_throw(result, points):
            if not state["started"]:
                return
            q, answer = questions[state["q_idx"]]
            if points == answer:
                state["score"] += 1
                log.add(f"F{state['q_idx']+1}: {result} ({points}) - RICHTIG!", "success")
            else:
                log.add(f"F{state['q_idx']+1}: {result} ({points}) - Falsch! (Antwort: {answer})", "miss")
            state["q_idx"] += 1
            show_question()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_world_tour(self):
        self.clear_frame()
        self._make_header("WORLD TOUR")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        cities = [
            ("London", 20, 501), ("Amsterdam", 18, 401), ("Berlin", 19, 501),
            ("Paris", 17, 301), ("Tokyo", 16, 501), ("New York", 15, 401),
            ("Sydney", 14, 301), ("Rio", 13, 501),
        ]
        state = {
            "city_idx": 0, "score": 0, "darts": 0,
            "city_score": 0, "started": True,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        city_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["accent"],
                            font=("Arial", 16, "bold"))
        city_lbl.pack(pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def show_city():
            if state["city_idx"] >= len(cities):
                state["started"] = False
                city_lbl.config(text="TOUR KOMPLETT!")
                log.add(f"World Tour geschafft! {state['score']} Punkte, {state['darts']} Darts", "success")
                return
            name, seg, target = cities[state["city_idx"]]
            state["city_score"] = target
            city_lbl.config(text=f"{name} (Segment {seg})")

        def update_display():
            if state["city_idx"] < len(cities):
                name, seg, target = cities[state["city_idx"]]
                status_lbl.config(text=f"  Stadt {state['city_idx']+1}/{len(cities)}\n"
                                       f"  Verbleibend: {state['city_score']}\n"
                                       f"  Gesamt: {state['score']} | Darts: {state['darts']}")
            else:
                status_lbl.config(text=f"  Score: {state['score']} | Darts: {state['darts']}")

        log.add("World Tour! Reise um die Welt und spiele in jeder Stadt!", "info")
        show_city()
        update_display()

        def on_throw(result, points):
            if not state["started"]:
                return
            state["darts"] += 1
            name, seg, target = cities[state["city_idx"]]
            hit_num, hit_type = parse_hit_number(result)
            if hit_num == seg:
                mult = {"triple": 3, "double": 2}.get(hit_type, 1)
                earned = seg * mult
                state["city_score"] -= earned
                state["score"] += earned
                log.add(f"  {name}: {result} ({earned}) -> {max(0, state['city_score'])} uebrig", "success")
            else:
                state["score"] += points // 2
                log.add(f"  {name}: {result} - Falsches Segment (+{points//2})", "warning")
            if state["city_score"] <= 0:
                log.add(f"  {name} geschafft!", "success")
                state["city_idx"] += 1
                show_city()
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_duel(self):
        self.clear_frame()
        self._make_header("DART DUEL")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        state = {
            "p1": "Spieler 1", "p2": "Spieler 2",
            "hp1": 100, "hp2": 100,
            "turn": 1, "round": 1,
            "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 12), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def update_display():
            b1 = "#" * (state["hp1"] // 5) + "." * (20 - state["hp1"] // 5)
            b2 = "#" * (state["hp2"] // 5) + "." * (20 - state["hp2"] // 5)
            cur = state["p1"] if state["turn"] == 1 else state["p2"]
            lines = [
                f"  Runde {state['round']}",
                f"  {state['p1']}: [{b1}] {state['hp1']}",
                f"  {state['p2']}: [{b2}] {state['hp2']}",
                f"\n  Am Zug: {cur}",
            ]
            status_lbl.config(text="\n".join(lines))

        def start_game():
            n1 = p1_entry.get().strip() or "Spieler 1"
            n2 = p2_entry.get().strip() or "Spieler 2"
            state["p1"] = n1
            state["p2"] = n2
            state["hp1"] = 100
            state["hp2"] = 100
            state["turn"] = 1
            state["round"] = 1
            state["started"] = True
            log.clear()
            log.add(f"Duel: {n1} vs {n2}!", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler 1:", bg=COLORS["panel"], fg=COLORS["text"]).pack(pady=1)
        p1_entry = tk.Entry(setup_frame, width=20)
        p1_entry.insert(0, "Spieler 1")
        p1_entry.pack(pady=1)
        tk.Label(setup_frame, text="Spieler 2:", bg=COLORS["panel"], fg=COLORS["text"]).pack(pady=1)
        p2_entry = tk.Entry(setup_frame, width=20)
        p2_entry.insert(0, "Spieler 2")
        p2_entry.pack(pady=1)
        ttk.Button(setup_frame, text="Duell starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            attacker = state["p1"] if state["turn"] == 1 else state["p2"]
            damage = points
            if result == "Bullseye":
                damage = 50
            elif result == "Miss":
                damage = 0
            if state["turn"] == 1:
                state["hp2"] = max(0, state["hp2"] - damage)
                log.add(f"R{state['round']} {attacker}: {result} -> {damage} Schaden!", "hit" if damage > 0 else "miss")
                state["turn"] = 2
            else:
                state["hp1"] = max(0, state["hp1"] - damage)
                log.add(f"R{state['round']} {attacker}: {result} -> {damage} Schaden!", "hit" if damage > 0 else "miss")
                state["turn"] = 1
                state["round"] += 1
            if state["hp1"] <= 0:
                state["started"] = False
                log.add(f"{state['p2']} GEWINNT DAS DUELL!", "success")
            elif state["hp2"] <= 0:
                state["started"] = False
                log.add(f"{state['p1']} GEWINNT DAS DUELL!", "success")
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_slots(self):
        self.clear_frame()
        self._make_header("DART SLOTS")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        symbols = ["Kirsche", "Zitrone", "Glocke", "Stern", "Diamant", "Sieben"]
        sym_icons = ["*", "O", "#", "+", "<>", "7"]
        state = {
            "credits": 100, "reels": [0, 0, 0], "reel_idx": 0,
            "spinning": False, "spins": 0, "max_credits": 100,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        reel_lbl = tk.Label(info, text="[ ? ] [ ? ] [ ? ]", bg=COLORS["panel"],
                            fg=COLORS["accent"], font=("Courier", 20, "bold"))
        reel_lbl.pack(pady=10)
        credit_lbl = tk.Label(info, text="Credits: 100", bg=COLORS["panel"],
                              fg=COLORS["text"], font=("Courier", 14))
        credit_lbl.pack(pady=5)

        def update_reels():
            parts = []
            for i in range(3):
                if state["spinning"] and i >= state["reel_idx"]:
                    parts.append("[ ? ]")
                else:
                    parts.append(f"[{sym_icons[state['reels'][i]]:^3}]")
            reel_lbl.config(text=" ".join(parts))
            credit_lbl.config(text=f"Credits: {state['credits']} | Spins: {state['spins']}")

        def start_spin():
            if state["credits"] < 10:
                log.add("Nicht genug Credits!", "miss")
                return
            state["credits"] -= 10
            state["spinning"] = True
            state["reel_idx"] = 0
            state["spins"] += 1
            log.add(f"Spin #{state['spins']}! Wirf 3 Darts...", "info")
            update_reels()

        def on_throw(result, points):
            if not state["spinning"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            idx = hit_num % len(symbols) if hit_num > 0 else 0
            if hit_type == "triple":
                idx = 5
            elif hit_type == "double":
                idx = min(idx + 1, 5)
            state["reels"][state["reel_idx"]] = idx
            log.add(f"  Walze {state['reel_idx']+1}: {result} -> {symbols[idx]}", "hit")
            state["reel_idx"] += 1
            if state["reel_idx"] >= 3:
                state["spinning"] = False
                r = state["reels"]
                payout = 0
                name = "Nichts"
                if r[0] == r[1] == r[2]:
                    payouts = [10, 15, 30, 75, 200, 500]
                    payout = payouts[r[0]]
                    name = f"3x {symbols[r[0]]}!"
                elif r[0] == r[1] or r[1] == r[2] or r[0] == r[2]:
                    payout = 5
                    name = "Ein Paar"
                if payout > 0:
                    state["credits"] += payout
                    log.add(f"  {name} = +{payout} Credits!", "success")
                else:
                    log.add(f"  {name}", "miss")
                state["max_credits"] = max(state["max_credits"], state["credits"])
                if state["credits"] < 10:
                    log.add(f"Game Over! Max Credits: {state['max_credits']}", "warning")
            update_reels()

        board.on_throw = on_throw

        def sim():
            if not state["spinning"]:
                start_spin()
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Drehen (10 Cr)", command=lambda: start_spin() if not state["spinning"] else None).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)
        log.add("Dart Slots! 10 Credits pro Spin.", "info")
        log.add("Triple = Sieben (Jackpot!)", "info")
        update_reels()

    def show_gui_auction(self):
        self.clear_frame()
        self._make_header("DART AUCTION")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board = DartBoardCanvas(left, size=340)
        board.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)
        import random as rnd
        state = {
            "players": [], "budgets": {}, "owned": {}, "scores": {},
            "segments": [], "seg_idx": 0, "current_bidder": 0,
            "bids": {}, "started": False,
        }
        info = tk.Frame(right, bg=COLORS["panel"])
        info.pack(fill=tk.X, pady=5)
        status_lbl = tk.Label(info, text="", bg=COLORS["panel"], fg=COLORS["text"],
                              font=("Courier", 11), justify=tk.LEFT, anchor="w")
        status_lbl.pack(fill=tk.X, padx=8, pady=5)

        def update_display():
            lines = []
            if state["seg_idx"] < len(state["segments"]):
                seg = state["segments"][state["seg_idx"]]
                lines.append(f"  Auktion: Segment {seg} (Runde {state['seg_idx']+1}/{len(state['segments'])})")
            for n in state["players"]:
                segs = sorted(state["owned"].get(n, []))
                seg_str = ",".join(str(s) for s in segs) if segs else "-"
                lines.append(f"  {n}: {state['budgets'].get(n,0)} Cr | {seg_str}")
            if state["started"] and state["current_bidder"] < len(state["players"]):
                lines.append(f"\n  Bieter: {state['players'][state['current_bidder']]}")
            status_lbl.config(text="\n".join(lines))

        def start_game():
            names = name_entry.get().strip()
            if not names:
                names = "Spieler 1,Spieler 2"
            plist = [n.strip() for n in names.split(",") if n.strip()]
            if len(plist) < 2:
                plist = ["Spieler 1", "Spieler 2"]
            state["players"] = plist
            state["budgets"] = {n: 500 for n in plist}
            state["owned"] = {n: [] for n in plist}
            state["scores"] = {n: 0 for n in plist}
            segs = list(range(1, 21))
            rnd.shuffle(segs)
            state["segments"] = segs[:10]
            state["seg_idx"] = 0
            state["current_bidder"] = 0
            state["bids"] = {}
            state["started"] = True
            log.clear()
            log.add("Auktion gestartet! Biete auf Segmente.", "info")
            setup_frame.pack_forget()
            update_display()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Spieler (kommagetrennt):", bg=COLORS["panel"],
                 fg=COLORS["text"]).pack(pady=2)
        name_entry = tk.Entry(setup_frame, width=30)
        name_entry.insert(0, "Alice,Bob")
        name_entry.pack(pady=2)
        ttk.Button(setup_frame, text="Auktion starten", command=start_game).pack(pady=5)

        def on_throw(result, points):
            if not state["started"]:
                return
            if state["seg_idx"] >= len(state["segments"]):
                return
            cur = state["players"][state["current_bidder"]]
            bid = min(points, state["budgets"][cur])
            if result == "Bullseye":
                bid = min(bid * 2, state["budgets"][cur])
            state["bids"][cur] = bid
            log.add(f"{cur} bietet {bid} (Wurf: {result})", "hit")
            state["current_bidder"] += 1
            if state["current_bidder"] >= len(state["players"]):
                seg = state["segments"][state["seg_idx"]]
                winner = max(state["bids"], key=state["bids"].get)
                win_bid = state["bids"][winner]
                state["budgets"][winner] -= win_bid
                state["owned"][winner].append(seg)
                state["scores"][winner] += seg
                log.add(f"  {winner} gewinnt Segment {seg} fuer {win_bid}!", "success")
                state["seg_idx"] += 1
                state["current_bidder"] = 0
                state["bids"] = {}
                if state["seg_idx"] >= len(state["segments"]):
                    state["started"] = False
                    winner_final = max(state["scores"], key=state["scores"].get)
                    log.add(f"AUKTION VORBEI! {winner_final} gewinnt!", "success")
                    for n in state["players"]:
                        log.add(f"  {n}: {state['scores'][n]} Punkte", "info")
            update_display()

        board.on_throw = on_throw

        def sim():
            r, p = board.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def show_gui_maze(self):
        self.clear_frame()
        self._make_header("DART MAZE")
        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True)
        left = tk.Frame(content, bg=COLORS["bg"])
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        right = tk.Frame(content, bg=COLORS["bg"])
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        board_canvas = DartBoardCanvas(left, size=300)
        board_canvas.pack(pady=5)
        btn_frame = tk.Frame(left, bg=COLORS["bg"])
        btn_frame.pack(pady=5)
        log = GameLog(right)
        log.pack(fill=tk.BOTH, expand=True)

        import random as rnd
        from maze import generate_maze, DIRECTIONS, DIR_SEGMENTS

        state = {
            "maze": None, "px": 0, "py": 0, "width": 5, "height": 5,
            "exit_x": 4, "exit_y": 4, "moves": 0, "items": {},
            "items_found": 0, "started": False, "fog": True,
        }

        maze_frame = tk.Frame(right, bg=COLORS["panel"])
        maze_frame.pack(fill=tk.X, pady=5)
        maze_canvas = tk.Canvas(maze_frame, bg="#1a1a2e", highlightthickness=0,
                                width=300, height=300)
        maze_canvas.pack(padx=10, pady=10)

        def draw_maze():
            maze_canvas.delete("all")
            m = state["maze"]
            if not m:
                return
            w, h = state["width"], state["height"]
            px, py = state["px"], state["py"]
            cell_size = min(280 // w, 280 // h)
            ox = (300 - w * cell_size) // 2
            oy = (300 - h * cell_size) // 2

            for y in range(h):
                for x in range(w):
                    visible = not state["fog"] or abs(x - px) + abs(y - py) <= 2
                    cx = ox + x * cell_size
                    cy = oy + y * cell_size

                    if not visible:
                        maze_canvas.create_rectangle(cx, cy, cx + cell_size, cy + cell_size,
                                                     fill="#2a2a3e", outline="#2a2a3e")
                        continue

                    maze_canvas.create_rectangle(cx, cy, cx + cell_size, cy + cell_size,
                                                 fill="#1a1a2e", outline="#1a1a2e")

                    wall_color = COLORS["text_dim"]
                    if m[y][x]["N"]:
                        maze_canvas.create_line(cx, cy, cx + cell_size, cy, fill=wall_color, width=2)
                    if m[y][x]["S"]:
                        maze_canvas.create_line(cx, cy + cell_size, cx + cell_size, cy + cell_size,
                                                fill=wall_color, width=2)
                    if m[y][x]["W"]:
                        maze_canvas.create_line(cx, cy, cx, cy + cell_size, fill=wall_color, width=2)
                    if m[y][x]["E"]:
                        maze_canvas.create_line(cx + cell_size, cy, cx + cell_size, cy + cell_size,
                                                fill=wall_color, width=2)

                    mid_x = cx + cell_size // 2
                    mid_y = cy + cell_size // 2
                    if x == px and y == py:
                        maze_canvas.create_oval(mid_x - 8, mid_y - 8, mid_x + 8, mid_y + 8,
                                                fill=COLORS["accent"], outline="white")
                    elif x == state["exit_x"] and y == state["exit_y"]:
                        maze_canvas.create_text(mid_x, mid_y, text="X", fill=COLORS["green"],
                                                font=("Courier", 14, "bold"))
                    elif (x, y) in state["items"]:
                        maze_canvas.create_text(mid_x, mid_y, text="?", fill=COLORS["yellow"],
                                                font=("Courier", 12, "bold"))

            maze_canvas.create_rectangle(ox, oy, ox + w * cell_size, oy + h * cell_size,
                                         outline=COLORS["text_dim"], width=2)

        def start_game(w, h):
            state["width"] = w
            state["height"] = h
            state["exit_x"] = w - 1
            state["exit_y"] = h - 1
            state["maze"] = generate_maze(w, h)
            state["px"] = 0
            state["py"] = 0
            state["moves"] = 0
            state["items"] = {}
            state["items_found"] = 0
            state["fog"] = True
            state["started"] = True
            for _ in range(3):
                ix, iy = rnd.randint(0, w - 1), rnd.randint(0, h - 1)
                if (ix, iy) != (0, 0) and (ix, iy) != (w - 1, h - 1):
                    state["items"][(ix, iy)] = rnd.choice(["Schluessel", "Trank", "Karte"])
            log.clear()
            log.add("Labyrinth gestartet!", "info")
            log.add("1-5=N, 6-10=O, 11-15=S, 16-20=W", "info")
            log.add("Bullseye = Karte aufdecken", "info")
            setup_frame.pack_forget()
            draw_maze()

        setup_frame = tk.Frame(right, bg=COLORS["panel"])
        setup_frame.pack(fill=tk.X, pady=5)
        tk.Label(setup_frame, text="Groesse waehlen:", bg=COLORS["panel"],
                 fg=COLORS["text"], font=("Courier", 11)).pack(pady=5)
        for label, w_val, h_val in [("Klein 5x5", 5, 5), ("Mittel 7x7", 7, 7), ("Gross 9x9", 9, 9)]:
            ttk.Button(setup_frame, text=label,
                       command=lambda w=w_val, h=h_val: start_game(w, h)).pack(pady=2)

        def on_throw(result, points):
            if not state["started"]:
                return
            hit_num, hit_type = parse_hit_number(result)
            state["moves"] += 1
            m = state["maze"]
            px, py = state["px"], state["py"]

            if result == "Bullseye":
                state["fog"] = False
                log.add(f"Wurf: {result} - Karte aufgedeckt!", "success")
                draw_maze()
                return

            cell = m[py][px]
            available = [d for d in ["N", "E", "S", "W"] if not cell[d]]

            moved = False
            for d, seg_range in DIR_SEGMENTS.items():
                if hit_num in seg_range and d in available:
                    dx, dy = DIRECTIONS[d]
                    state["px"] = px + dx
                    state["py"] = py + dy
                    log.add(f"Wurf: {result} ({points}) - {d}!", "hit")
                    moved = True
                    break

            if not moved:
                log.add(f"Wurf: {result} ({points}) - Wand!", "miss")

            npx, npy = state["px"], state["py"]
            if (npx, npy) in state["items"]:
                item = state["items"].pop((npx, npy))
                state["items_found"] += 1
                log.add(f"Item gefunden: {item}!", "success")

            draw_maze()

            if npx == state["exit_x"] and npy == state["exit_y"]:
                state["started"] = False
                log.add(f"LABYRINTH GESCHAFFT! Zuege: {state['moves']}", "success")
                wh = state["width"] + state["height"]
                if state["moves"] <= wh:
                    log.add("Bewertung: PERFEKT!", "success")
                elif state["moves"] <= wh * 2:
                    log.add("Bewertung: Sehr gut!", "success")
                else:
                    log.add("Bewertung: Geschafft!", "info")

        board_canvas.on_throw = on_throw

        def sim():
            r, p = board_canvas.simulate_throw()
            on_throw(r, p)

        ttk.Button(btn_frame, text="Zufallswurf", command=sim).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Beenden", command=self.show_main_menu).pack(side=tk.LEFT, padx=5)

    def _placeholder(self, name):
        messagebox.showinfo("Kommt bald",
                            f"{name} wird noch ins GUI integriert.\n"
                            f"Nutze 'python3 dart_game.py' fuer die Terminal-Version.")

    def run(self):
        self.root.mainloop()


def main():
    app = DartGameGUI()
    app.run()


if __name__ == "__main__":
    main()
