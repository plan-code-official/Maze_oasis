import re, pathlib
s = pathlib.Path('temp_itch_page.html').read_text(encoding='utf-8', errors='ignore')
urls = sorted(set(re.findall(r'https?://[^"\s>]+', s)))
for u in urls[:80]:
    print(u)
