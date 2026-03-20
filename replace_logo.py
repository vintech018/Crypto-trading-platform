import os
import re

page_path = "src/app/page.tsx"
with open(page_path, "r", encoding="utf-8") as f:
    page = f.read()

# Replace any SVG that has the layers icon path (with 3 paths)
pattern3 = r'<svg[^>]+>\s*<path d="M12 2L2 7l10 5 10-5-10-5z"[^>]*/>\s*<path d="M2 17l10 5 10-5"[^>]*/>\s*<path d="M2 12l10 5 10-5"[^>]*/>\s*</svg>'
page = re.sub(pattern3, '<img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />', page)

# Replace any SVG that has the small layers icon path (with 2 paths)
pattern2 = r'<svg[^>]+>\s*<path d="M12 2L2 7l10 5 10-5-10-5z"[^>]*/>\s*<path d="M2 17l10 5 10-5"[^>]*/>\s*</svg>'
page = re.sub(pattern2, '<img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />', page)

with open(page_path, "w", encoding="utf-8") as f:
    f.write(page)
