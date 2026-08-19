from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "docs" / "report_assets"
SHOT_DIR = ASSET_DIR / "screenshots"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

INK = (24, 30, 42)
MUTED = (92, 99, 112)
LINE = (210, 217, 226)
FILL = (246, 248, 251)
HEADER = (231, 235, 241)
WHITE = (255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for item in candidates:
        path = Path(item)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


F_TITLE = font(34, True)
F_SUB = font(20)
F_LABEL = font(20, True)
F_SMALL = font(16)


def fit_image(path: Path, size: tuple[int, int]) -> Image.Image:
    img = Image.open(path).convert("RGB")
    canvas = Image.new("RGB", size, WHITE)
    ratio = min(size[0] / img.width, size[1] / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    canvas.paste(resized, (x, y))
    return canvas


def crop_ui(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGB")
    width, height = img.size
    top = min(120, max(0, height - 1))
    bottom = min(height, top + 610)
    return img.crop((0, top, width, bottom))


def fit_pil_image(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, WHITE)
    ratio = min(size[0] / img.width, size[1] / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    canvas.paste(resized, (x, y))
    return canvas


def rounded_rect(draw: ImageDraw.ImageDraw, xy, radius=18, fill=WHITE, outline=LINE, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def create_collage(title: str, subtitle: str, files: list[tuple[str, str]], output: str) -> None:
    width, height = 1800, 2300
    img = Image.new("RGB", (width, height), WHITE)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, width, 138), fill=FILL)
    draw.text((60, 38), title, fill=INK, font=F_TITLE)
    draw.text((60, 88), subtitle, fill=MUTED, font=F_SUB)

    card_w = 1680
    card_h = 610
    gap = 70
    x = 60
    start_y = 210
    for index, (label, file_name) in enumerate(files):
        y = start_y + index * (card_h + gap)
        rounded_rect(draw, (x, y, x + card_w, y + card_h), radius=22, fill=WHITE)
        draw.rectangle((x + 2, y + 2, x + card_w - 2, y + 58), fill=HEADER)
        draw.text((x + 24, y + 17), label, fill=INK, font=F_LABEL)
        screen = fit_pil_image(crop_ui(SHOT_DIR / file_name), (card_w - 40, card_h - 94))
        img.paste(screen, (x + 20, y + 74))
    img.save(ASSET_DIR / output)


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int]) -> None:
    draw.line((*start, *end), fill=INK, width=4)
    ex, ey = end
    sx, sy = start
    if ex > sx:
        points = [(ex, ey), (ex - 14, ey - 8), (ex - 14, ey + 8)]
    else:
        points = [(ex, ey), (ex + 14, ey - 8), (ex + 14, ey + 8)]
    draw.polygon(points, fill=INK)


def box(draw: ImageDraw.ImageDraw, xy, title: str, body: str) -> None:
    rounded_rect(draw, xy, radius=20, fill=WHITE, outline=LINE, width=2)
    x1, y1, x2, y2 = xy
    draw.text((x1 + 24, y1 + 20), title, fill=INK, font=F_LABEL)
    lines = wrap_text(body, 34)
    for i, line in enumerate(lines[:3]):
        draw.text((x1 + 24, y1 + 58 + i * 22), line, fill=MUTED, font=F_SMALL)


def wrap_text(text: str, limit: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = " ".join(current + [word])
        if len(candidate) > limit and current:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines


def architecture_diagram() -> None:
    img = Image.new("RGB", (1800, 1040), WHITE)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 1800, 130), fill=FILL)
    draw.text((60, 36), "System Architecture", fill=INK, font=F_TITLE)
    draw.text((60, 86), "Role-based React app connected to Supabase, Express API, and Ollama Llama 3.2.", fill=MUTED, font=F_SUB)

    boxes = {
        "user": (80, 245, 390, 390),
        "react": (520, 245, 860, 390),
        "supabase": (1010, 170, 1390, 315),
        "api": (1010, 410, 1390, 555),
        "ollama": (1480, 410, 1740, 555),
        "ticket": (520, 640, 860, 785),
        "engineer": (1010, 640, 1390, 785),
        "admin": (1480, 640, 1740, 785),
    }
    box(draw, boxes["user"], "User / Engineer / Admin", "Role signs in and opens protected pages.")
    box(draw, boxes["react"], "React Frontend", "Routes, forms, dashboards, session, and UI.")
    box(draw, boxes["supabase"], "Supabase Postgres", "Users, tickets, KB, chat history, resolution history.")
    box(draw, boxes["api"], "Express API", "Troubleshooting endpoint for AI requests.")
    box(draw, boxes["ollama"], "Ollama Llama 3.2", "Local AI model returns troubleshooting steps.")
    box(draw, boxes["ticket"], "Ticket Workflow", "Priority, team, status, engineer, timestamps.")
    box(draw, boxes["engineer"], "Engineer Dashboard", "Assign, update status, remarks, resolution notes.")
    box(draw, boxes["admin"], "Admin Dashboard", "Analytics, users, tickets, KB management, reports.")
    draw_arrow(draw, (390, 318), (520, 318))
    draw_arrow(draw, (860, 290), (1010, 245))
    draw_arrow(draw, (860, 345), (1010, 485))
    draw_arrow(draw, (1390, 485), (1480, 485))
    draw_arrow(draw, (690, 390), (690, 640))
    draw_arrow(draw, (860, 710), (1010, 710))
    draw_arrow(draw, (1390, 710), (1480, 710))
    img.save(ASSET_DIR / "system_architecture_diagram.png")


def ai_pipeline_diagram() -> None:
    img = Image.new("RGB", (1800, 920), WHITE)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 1800, 130), fill=FILL)
    draw.text((60, 36), "AI Help Pipeline", fill=INK, font=F_TITLE)
    draw.text((60, 86), "Knowledge Base first, AI fallback second, ticket creation only when unresolved.", fill=MUTED, font=F_SUB)

    flow = [
        ((80, 260, 360, 405), "Describe Issue", "User enters a technical issue."),
        ((450, 260, 730, 405), "Search KB", "Keywords are matched with common issues."),
        ((820, 260, 1100, 405), "Use AI Fallback", "If no KB answer exists, AI generates steps."),
        ((1190, 260, 1470, 405), "User Decision", "Resolved or proceed to human support."),
        ((820, 585, 1100, 730), "Save Chat", "Resolved issue is stored in chat history."),
        ((1190, 585, 1470, 730), "Create Ticket", "Unresolved issue becomes a support ticket."),
        ((1530, 585, 1740, 730), "Engineer/Admin", "Track, resolve, and report."),
    ]
    for xy, title, body in flow:
        box(draw, xy, title, body)
    draw_arrow(draw, (360, 333), (450, 333))
    draw_arrow(draw, (730, 333), (820, 333))
    draw_arrow(draw, (1100, 333), (1190, 333))
    draw_arrow(draw, (1330, 405), (985, 585))
    draw_arrow(draw, (1330, 405), (1330, 585))
    draw_arrow(draw, (1470, 655), (1530, 655))
    draw.text((910, 528), "Resolved", fill=MUTED, font=F_SMALL)
    draw.text((1348, 528), "Not resolved", fill=MUTED, font=F_SMALL)
    img.save(ASSET_DIR / "ai_help_pipeline_diagram.png")


create_collage(
    "User Pages and Activity",
    "AI Help, ticket creation, and personal ticket tracking.",
    [
        ("AI Help", "user-ai-help.png"),
        ("Raise Ticket", "user-raise-ticket.png"),
        ("My Tickets", "user-my-tickets.png"),
    ],
    "user_pages_collage.png",
)
create_collage(
    "Support Engineer Pages and Activity",
    "Engineer dashboard, ticket queue, and ticket context review.",
    [
        ("Engineer Home", "engineer-dashboard.png"),
        ("Manage Tickets", "engineer-tickets.png"),
        ("Ticket Details", "engineer-ticket-details.png"),
    ],
    "engineer_pages_collage.png",
)
create_collage(
    "Admin Pages and Activity",
    "Analytics, Knowledge Base management, and ticket monitoring.",
    [
        ("Admin Dashboard", "admin-dashboard.png"),
        ("KB Management", "admin-kb-management.png"),
        ("All Tickets", "admin-tickets.png"),
    ],
    "admin_pages_collage.png",
)
architecture_diagram()
ai_pipeline_diagram()
print(ASSET_DIR)
