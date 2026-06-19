#!/usr/bin/env python3
"""Dart Game GUI: Visuelles Interface mit tkinter."""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import math
import random
import threading
import time

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
        self.text.tag_configure("bold", font=("Consolas", 10, "bold"))
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
            ("Party-Minispiele", "Killer, Shanghai, Bingo & mehr", COLORS["yellow"],
             self.show_minigames_menu),
            ("Dart Bowling", "10 Frames Bowling mit Darts", COLORS["accent"],
             self.show_gui_bowling),
            ("Dart Memory", "Finde die Paare", COLORS["accent2"],
             self.show_gui_memory),
            ("Dart Blackjack", "Kartenspiel 21", COLORS["red"],
             self.show_gui_blackjack),
        ]

        for text, desc, color, cmd in games:
            btn = MenuButton(left, text, desc, cmd, color)
            btn.pack(fill=tk.X, pady=3)

        tk.Label(right, text="TRAINING & TOOLS", bg=COLORS["bg"], fg=COLORS["accent"],
                 font=("Arial", 14, "bold"), anchor="w").pack(fill=tk.X, pady=(0, 10))

        tools = [
            ("Training", "Around the Clock, Double Out & mehr", COLORS["green"],
             self.show_training_menu),
            ("Freies Werfen", "Wirf auf die Dartscheibe", COLORS["accent"],
             self.show_free_throw),
            ("Around the Clock", "1-20 + Bull der Reihe nach", COLORS["yellow"],
             self.show_around_the_clock),
            ("Treasure Hunt", "Erkunde die Schatzkarte", COLORS["accent2"],
             self.show_gui_treasure),
            ("Dart Assassin", "Geheime Auftraege (3-6 Spieler)", COLORS["red"],
             lambda: self._placeholder("Dart Assassin")),
            ("Dart Puzzle", "Zahlenraetsel loesen", COLORS["green"],
             lambda: self._placeholder("Dart Puzzle")),
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

        games = [
            ("Killer", "3+ Spieler, Double-Jagd", COLORS["red"]),
            ("Shanghai", "2+ Spieler, 15-20 + Bull", COLORS["accent2"]),
            ("Dart-Bingo", "1-4 Spieler", COLORS["green"]),
            ("Dart Roulette", "Glücksrad", COLORS["yellow"]),
            ("Dart Golf", "9 Löcher", COLORS["green"]),
            ("Dart Poker", "Pokerhände", COLORS["accent"]),
            ("Math Darts", "Kopfrechnen", COLORS["accent2"]),
            ("Lucky Number", "Glückszahl", COLORS["yellow"]),
            ("Dart Blackjack", "Kartenspiel 21", COLORS["red"]),
        ]

        for text, desc, color in games:
            btn = MenuButton(content, text, desc, lambda t=text: self._placeholder(t), color)
            btn.pack(fill=tk.X, pady=3)

        self._make_back_button(content)

    def show_training_menu(self):
        self.clear_frame()
        self._make_header("TRAINING")

        content = tk.Frame(self.current_frame, bg=COLORS["bg"])
        content.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)

        modes = [
            ("Around the Clock", "1-20 + Bull", COLORS["green"]),
            ("Double Out", "D1-D20", COLORS["accent2"]),
            ("Triple Challenge", "30 Darts", COLORS["accent"]),
            ("Speed Darts", "Reaktion", COLORS["yellow"]),
            ("Target Practice", "Zieltraining", COLORS["green"]),
            ("Kombo-Challenge", "Streak-Bonus", COLORS["red"]),
            ("Endurance", "Überlebensmodus", COLORS["accent2"]),
            ("Survival", "Wellen-Modus", COLORS["accent"]),
            ("Reaktionstest", "Reflex-Test", COLORS["yellow"]),
            ("Dart Puzzle", "Zahlenrätsel", COLORS["green"]),
        ]

        for text, desc, color in modes:
            btn = MenuButton(content, text, desc, lambda t=text: self._placeholder(t), color)
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
                scores[player] = old_score - round_score[0]
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
                    scores[player] = old_score - round_score[0]
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

                    def hide_both():
                        hide_card(f)
                        hide_card(s)
                        mem_board[f]["revealed"] = False
                        mem_board[s]["revealed"] = False

                    self.root.after(1000, hide_both)

                first_pick[0] = None
                state[0] = "picking_first"
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

            if result == "Bullseye":
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

    def _placeholder(self, name):
        messagebox.showinfo("Kommt bald",
                            f"{name} wird noch ins GUI integriert.\n"
                            f"Nutze 'python3 dart_game.py' für die Terminal-Version.")

    def run(self):
        self.root.mainloop()


def main():
    app = DartGameGUI()
    app.run()


if __name__ == "__main__":
    main()
