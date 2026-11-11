import pathlib, re
html = pathlib.Path('temp_itch_page.html').read_text(encoding='utf-8', errors='ignore')
patterns = ['rh/', 'download_url', 'purchase_url', 'game_url', 'key']
for pat in patterns:
    print('PATTERN', pat)
    matches = re.findall(r'[^\n]{0,200}' + re.escape(pat) + r'[^\n]{0,200}', html)
    for m in matches[:10]:
        print(m)
    print()
