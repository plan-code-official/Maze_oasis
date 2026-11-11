import re, pathlib
html = pathlib.Path('temp_itch_page.html').read_text(encoding='utf-8', errors='ignore')
for m in re.findall(r'https://reodesuxz\.itch\.io/free-pixel-top-down-desert-town-and-oasis-tileset-16x16[^\"\']+', html):
    print(m)
