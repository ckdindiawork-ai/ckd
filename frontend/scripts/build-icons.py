#!/usr/bin/env python3
"""
CKD Icon Pipeline — Production-Grade Adaptive Icon Generator

Generates Android Adaptive Icons + iOS icons + Splash + Favicon following
Material Design + Apple Human Interface Guidelines.

Source: assets/images/_originals/icon.png (1024x1024 with logo)

Outputs (all RGBA PNG, sRGB):
  - icon.png            1024x1024  iOS / Web — logo on purple, safe 80% zone
  - adaptive-icon.png   1024x1024  Android adaptive foreground — logo at 60%
                                   on TRANSPARENT bg (purple set via app.json)
  - splash-icon.png     1284x1284  Splash — logo at ~40% center, transparent
  - favicon.png          256x256   Web favicon — logo at 75%

Specs followed:
  - Android Adaptive: 108dp total, 72dp safe zone = 66.67% safe ratio
    (logo MUST fit in inner 66% — outer ring may be cropped by launcher mask)
  - iOS Icon: 100% canvas usable but logo at 80% looks centered with curve
  - 8pt grid alignment

Usage: python3 scripts/build-icons.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG_DIR = os.path.join(ROOT, "assets", "images", "_originals")
OUT_DIR = os.path.join(ROOT, "assets", "images")

# Brand colors (CKD)
BRAND_PURPLE = (58, 28, 113, 255)     # #3A1C71
BRAND_PURPLE_DARK = (31, 13, 74, 255)  # darker shade for gradient
BRAND_GOLD = (244, 180, 0, 255)       # #F4B400

# Canvas specs
ICON_SIZE = 1024
ADAPTIVE_SIZE = 1024
SPLASH_SIZE = 1284
FAVICON_SIZE = 256

# Safe-zone ratios (logo width as fraction of canvas)
ICON_LOGO_RATIO = 0.80      # iOS — 80% looks balanced with rounded corner
ADAPTIVE_LOGO_RATIO = 0.60  # Android — STRICT 60% (under spec's 66%) for any launcher mask
SPLASH_LOGO_RATIO = 0.42    # Splash — logo small + spacious bg
FAVICON_LOGO_RATIO = 0.78   # Web tab icon


def load_source_logo():
    """
    Load the source logo and extract just the visible content (cropped to
    non-transparent bbox), returned at high quality.

    Prefer adaptive-icon.png (113px margins → cleaner extract) over icon.png
    (which is full-bleed and may include edge artifacts).
    """
    src_candidates = ["adaptive-icon.png", "icon.png"]
    for cand in src_candidates:
        p = os.path.join(ORIG_DIR, cand)
        if not os.path.exists(p):
            continue
        img = Image.open(p).convert("RGBA")
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            # Crop to actual content
            logo = img.crop(bbox)
            # Make it square (pad shorter dimension)
            w, h = logo.size
            side = max(w, h)
            square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            square.paste(logo, ((side - w) // 2, (side - h) // 2), logo)
            print(f"  Source: {cand} → extracted {w}x{h} → squared to {side}x{side}")
            return square
    raise FileNotFoundError("No source icon found in _originals/")


def fit_logo_into(canvas_size, logo_ratio, logo_img):
    """Resize logo to (logo_ratio * canvas_size) preserving aspect, return RGBA."""
    target_side = int(canvas_size * logo_ratio)
    return logo_img.resize((target_side, target_side), Image.LANCZOS)


def paste_centered(canvas, logo):
    """Paste logo dead-center on canvas with proper alpha compositing."""
    cw, ch = canvas.size
    lw, lh = logo.size
    canvas.alpha_composite(logo, ((cw - lw) // 2, (ch - lh) // 2))
    return canvas


def make_purple_canvas(size, gradient=False):
    """Solid or gradient purple canvas."""
    if not gradient:
        return Image.new("RGBA", (size, size), BRAND_PURPLE)
    # Subtle vertical gradient — top BRAND_PURPLE → bottom BRAND_PURPLE_DARK
    canvas = Image.new("RGBA", (size, size), BRAND_PURPLE)
    px = canvas.load()
    r1, g1, b1, _ = BRAND_PURPLE
    r2, g2, b2, _ = BRAND_PURPLE_DARK
    for y in range(size):
        t = y / (size - 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        for x in range(size):
            px[x, y] = (r, g, b, 255)
    return canvas


def build_ios_icon(logo):
    """iOS icon — solid purple bg, logo at 80%."""
    canvas = make_purple_canvas(ICON_SIZE, gradient=True)
    sized_logo = fit_logo_into(ICON_SIZE, ICON_LOGO_RATIO, logo)
    return paste_centered(canvas, sized_logo)


def build_adaptive_foreground(logo):
    """
    Android adaptive icon FOREGROUND — TRANSPARENT background, logo at 60%
    centered. Purple background comes from app.json's adaptiveIcon.backgroundColor.
    This ensures the logo is NEVER cropped by any launcher mask (circle,
    squircle, rounded square, teardrop) since 60% < 66% safe zone.
    """
    canvas = Image.new("RGBA", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), (0, 0, 0, 0))
    sized_logo = fit_logo_into(ADAPTIVE_SIZE, ADAPTIVE_LOGO_RATIO, logo)
    return paste_centered(canvas, sized_logo)


def build_splash(logo):
    """Splash screen — transparent canvas (purple bg via expo-splash-screen),
       logo small + centered for premium feel."""
    canvas = Image.new("RGBA", (SPLASH_SIZE, SPLASH_SIZE), (0, 0, 0, 0))
    sized_logo = fit_logo_into(SPLASH_SIZE, SPLASH_LOGO_RATIO, logo)
    return paste_centered(canvas, sized_logo)


def build_favicon(logo):
    """Web favicon — solid purple bg + logo at 78%."""
    canvas = make_purple_canvas(FAVICON_SIZE, gradient=False)
    sized_logo = fit_logo_into(FAVICON_SIZE, FAVICON_LOGO_RATIO, logo)
    return paste_centered(canvas, sized_logo)


def simulate_launcher_masks(adaptive_fg_path, out_dir):
    """
    Save preview images showing how the adaptive icon will look under
    different Android launcher mask shapes. For dev verification only.
    """
    os.makedirs(out_dir, exist_ok=True)
    bg = make_purple_canvas(ADAPTIVE_SIZE)
    fg = Image.open(adaptive_fg_path).convert("RGBA")
    # Compose final
    composed = bg.copy()
    composed.alpha_composite(fg)

    masks = {
        "circle": lambda d: d.ellipse((0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1), fill=255),
        "rounded-square": lambda d: d.rounded_rectangle(
            (0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1), radius=int(ADAPTIVE_SIZE * 0.22), fill=255
        ),
        "squircle": lambda d: d.rounded_rectangle(
            (0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1), radius=int(ADAPTIVE_SIZE * 0.38), fill=255
        ),
        "teardrop": lambda d: (
            d.ellipse((0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1), fill=255),
            d.pieslice((0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1), -45, 45, fill=255),
        ),
    }
    for name, drawer in masks.items():
        mask = Image.new("L", (ADAPTIVE_SIZE, ADAPTIVE_SIZE), 0)
        draw = ImageDraw.Draw(mask)
        result = drawer(draw)
        # Apply mask as alpha
        masked = composed.copy()
        masked.putalpha(mask)
        out = os.path.join(out_dir, f"preview-{name}.png")
        masked.thumbnail((512, 512), Image.LANCZOS)
        masked.save(out)
        print(f"  preview: {name} → {out}")


def main():
    print("═" * 60)
    print("CKD Icon Pipeline — Production-Grade Generator")
    print("═" * 60)

    print("\n[1/4] Loading source logo...")
    logo = load_source_logo()
    print(f"      Logo loaded: {logo.size}")

    print("\n[2/4] Generating icons...")

    ios_icon = build_ios_icon(logo)
    p = os.path.join(OUT_DIR, "icon.png")
    ios_icon.save(p, "PNG", optimize=True)
    print(f"  ✓ icon.png            {ios_icon.size}  iOS / Web (purple bg, {int(ICON_LOGO_RATIO*100)}% logo)")

    adaptive_fg = build_adaptive_foreground(logo)
    p = os.path.join(OUT_DIR, "adaptive-icon.png")
    adaptive_fg.save(p, "PNG", optimize=True)
    print(f"  ✓ adaptive-icon.png   {adaptive_fg.size}  Android foreground ({int(ADAPTIVE_LOGO_RATIO*100)}% logo, transparent)")

    splash = build_splash(logo)
    p = os.path.join(OUT_DIR, "splash-icon.png")
    splash.save(p, "PNG", optimize=True)
    print(f"  ✓ splash-icon.png     {splash.size}  Splash ({int(SPLASH_LOGO_RATIO*100)}% logo, transparent)")

    favicon = build_favicon(logo)
    p = os.path.join(OUT_DIR, "favicon.png")
    favicon.save(p, "PNG", optimize=True)
    print(f"  ✓ favicon.png         {favicon.size}  Web ({int(FAVICON_LOGO_RATIO*100)}% logo, purple bg)")

    print("\n[3/4] Verifying outputs...")
    for f, expected in [
        ("icon.png", (ICON_SIZE, ICON_SIZE)),
        ("adaptive-icon.png", (ADAPTIVE_SIZE, ADAPTIVE_SIZE)),
        ("splash-icon.png", (SPLASH_SIZE, SPLASH_SIZE)),
        ("favicon.png", (FAVICON_SIZE, FAVICON_SIZE)),
    ]:
        p = os.path.join(OUT_DIR, f)
        img = Image.open(p)
        ok = img.size == expected and img.mode == "RGBA"
        print(f"  {'✓' if ok else '✗'} {f}: {img.size} {img.mode}")

    print("\n[4/4] Generating launcher mask previews (dev only)...")
    preview_dir = os.path.join(OUT_DIR, "_previews")
    simulate_launcher_masks(os.path.join(OUT_DIR, "adaptive-icon.png"), preview_dir)

    print("\n" + "═" * 60)
    print("✅ Icon pipeline complete.")
    print("═" * 60)
    print(f"\n  Originals backed up: assets/images/_originals/")
    print(f"  Launcher previews:   assets/images/_previews/")
    print(f"\n  Next: yarn stamp-build && verify in /buildinfo screen")


if __name__ == "__main__":
    main()
