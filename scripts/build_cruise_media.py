"""Derive web media directly from the supplied 1920x1080 dinner master.

Usage: python scripts/build_cruise_media.py --ffmpeg PATH --source PATH
No upscaling, sharpening, frame interpolation or AI reconstruction is applied.
"""
import argparse
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--ffmpeg", required=True)
parser.add_argument("--source", required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / "apps/web/public"
crop = "crop=1632:832:144:124,setsar=1"

def run(*options):
    subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *map(str, options)], check=True)

shots = [(5, 10), (95, 99), (32, 37), (48, 52), (111, 115), (119, 123), (99, 103)]
filters = [f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,{crop},fps=30[v{i}]" for i, (start, end) in enumerate(shots)]
filters.append("".join(f"[v{i}]" for i in range(len(shots))) + f"concat=n={len(shots)}:v=1:a=0[out]")
run("-i", args.source, "-filter_complex", ";".join(filters), "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-threads", "4", "-movflags", "+faststart", root / "videos/riverlife-cinematic-hq.mp4")
run("-ss", "106", "-i", args.source, "-t", "19", "-vf", crop + ",fps=30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-threads", "4", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", root / "videos/riverlife-performances-hq.mp4")
for name, second in [("buffet", 36), ("seafood", 49), ("dining", 106.2), ("hanuman", 112.3), ("river-view", 100.5)]:
    run("-ss", str(second), "-i", args.source, "-vf", crop, "-frames:v", "1", "-c:v", "libwebp", "-quality", "94", root / f"images/experiences/{name}-hq.webp")
run("-i", root / "videos/riverlife-cinematic-hq.mp4", "-frames:v", "1", "-c:v", "libwebp", "-quality", "96", root / "images/boat/riverlife-cinematic-hq-poster.webp")
run("-ss", "100.5", "-i", args.source, "-vf", crop, "-frames:v", "1", "-c:v", "libwebp", "-quality", "94", root / "images/landmarks/rama-viii-supplied-hq.webp")
print("Created native 1632x832 assets cropped from the 1920x1080 master; never upscaled.")
