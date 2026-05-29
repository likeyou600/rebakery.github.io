#!/usr/bin/env python3
"""Resize image dimensions by a percentage.

Usage:
  python resize_image.py image.png 90%
  python resize_image.py image.png 50 --in-place
  python resize_image.py image.png 75% -o smaller.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: Pillow\n"
        "Install it with: python -m pip install Pillow"
    ) from exc


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def parse_percent(value: str) -> float:
    raw = value.strip()
    if raw.endswith("%"):
        raw = raw[:-1]

    try:
        percent = float(raw)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("percent must look like 90 or 90%") from exc

    if percent <= 0:
        raise argparse.ArgumentTypeError("percent must be greater than 0")

    return percent / 100.0


def default_output_path(input_path: Path, scale: float) -> Path:
    percent_label = f"{round(scale * 100):g}pct"
    return input_path.with_name(f"{input_path.stem}_{percent_label}{input_path.suffix}")


def resize_image(input_path: Path, output_path: Path, scale: float) -> None:
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    if input_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise SystemExit(f"Unsupported file type: {input_path.suffix}\nSupported: {supported}")

    with Image.open(input_path) as image:
        new_size = (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        )

        resized = image.resize(new_size, Image.Resampling.LANCZOS)

        save_kwargs = {}
        if output_path.suffix.lower() in {".jpg", ".jpeg"}:
            save_kwargs = {"quality": 92, "optimize": True}
            if resized.mode in {"RGBA", "LA", "P"}:
                resized = resized.convert("RGB")
        elif output_path.suffix.lower() == ".png":
            save_kwargs = {"optimize": True}

        resized.save(output_path, **save_kwargs)

        print(f"{input_path.name}: {image.width}x{image.height} -> {new_size[0]}x{new_size[1]}")
        print(f"Saved: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Resize image dimensions by a percentage.")
    parser.add_argument("image", type=Path, help="image filename or path")
    parser.add_argument("percent", type=parse_percent, help="resize percent, like 90 or 90%%")
    parser.add_argument("-o", "--output", type=Path, help="output filename")
    parser.add_argument("--in-place", action="store_true", help="overwrite the input image")
    args = parser.parse_args()

    if args.output and args.in_place:
        raise SystemExit("Use either --output or --in-place, not both.")

    input_path = args.image
    output_path = args.output or (input_path if args.in_place else default_output_path(input_path, args.percent))

    resize_image(input_path, output_path, args.percent)


if __name__ == "__main__":
    main()
