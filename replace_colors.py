import os

css_path = "src/app/globals.css"
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

css = css.replace("rgba(0, 232, 149", "rgba(255, 255, 255")
css = css.replace("rgba(0,232,149", "rgba(255,255,255")
css = css.replace("#00e895", "#ffffff")
css = css.replace("rgba(0, 194, 122", "rgba(255, 255, 255")
css = css.replace("var(--neon-green)", "#ffffff")
css = css.replace("rgba(56,189,248", "rgba(255,255,255")
css = css.replace("rgba(167,139,250", "rgba(255,255,255")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)
