from pathlib import Path

path = Path("app/routers/prescription_routes.py")
source = path.read_text(encoding="utf-8")

# Remove the accidental literal backslash-n at the end of the file.
source = source.rstrip()

if source.endswith(r"\n"):
    source = source[:-2].rstrip()

path.write_text(source + "\n", encoding="utf-8")

print("File ending corrected.")
