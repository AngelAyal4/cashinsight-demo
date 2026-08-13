#!/usr/bin/env python3
"""Genera public/og.png (1200x630) para Open Graph de CashinsightApp.

Sin datos de usuario: solo literales de marca. Re-ejecutable: corre con
python3 + Pillow del sistema (no es dependencia npm ni de runtime).
"""

import os

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 630

PAPER = "#f2efe6"
INK = "#111111"
LIME = "#a3e635"

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def load_font(size: int) -> ImageFont.ImageFont:
    if os.path.exists(FONT_PATH):
        return ImageFont.truetype(FONT_PATH, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(img)

    draw.rectangle([40, 40, WIDTH - 40, HEIGHT - 40], outline=INK, width=8)
    draw.rectangle([64, 64, WIDTH - 64, HEIGHT - 64], outline=INK, width=2)

    font_brand = load_font(88)
    font_dollar = load_font(120)

    dollar = draw.textbbox((0, 0), "$", font=font_dollar)
    dollar_w = dollar[2] - dollar[0]
    dollar_h = dollar[3] - dollar[1]

    brand_bbox = draw.textbbox((0, 0), "CashinsightApp", font=font_brand)
    brand_w = brand_bbox[2] - brand_bbox[0]

    content_x = 128
    content_y = 150
    gap = 40
    square = 168
    text_x = content_x + square + gap
    max_tagline_width = WIDTH - 128 - text_x
    tagline_size = 40
    tagline_text = "Metas de ahorro y gastos, mes a mes"
    font_tagline = load_font(tagline_size)
    tagline_bbox = draw.textbbox((0, 0), tagline_text, font=font_tagline)
    tagline_w = tagline_bbox[2] - tagline_bbox[0]
    while tagline_w > max_tagline_width and tagline_size > 24:
        tagline_size -= 2
        font_tagline = load_font(tagline_size)
        tagline_bbox = draw.textbbox((0, 0), tagline_text, font=font_tagline)
        tagline_w = tagline_bbox[2] - tagline_bbox[0]

    draw.rectangle(
        [content_x, content_y, content_x + square, content_y + square],
        fill=LIME,
        outline=INK,
        width=6,
    )
    draw.text(
        (
            content_x + (square - dollar_w) // 2 - dollar[0],
            content_y + (square - dollar_h) // 2 - dollar[1],
        ),
        "$",
        font=font_dollar,
        fill=INK,
    )

    text_y = content_y + 16
    draw.text((text_x, text_y), "CashinsightApp", font=font_brand, fill=INK)
    draw.text(
        (text_x + 6, text_y + 100),
        tagline_text,
        font=font_tagline,
        fill=INK,
    )

    draw.rectangle([128, HEIGHT - 160, 128 + brand_w + 60, HEIGHT - 96], fill=INK)
    img.save("public/og.png", "PNG")
    print("OK public/og.png")


if __name__ == "__main__":
    main()
