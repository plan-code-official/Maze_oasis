import re, pathlib
html = pathlib.Path('temp_itch_page.html').read_text(encoding='utf-8', errors='ignore')
for token in ['download', 'purchase', 'download_url', 'game_file', 'upload_size', 'file_name']:
    print('TOKEN', token)
    matches = re.findall(r'[^\n]{0,200}' + token + r'[^\n]{0,200}', html, flags=re.I)
    for m in matches[:10]:
        print(m[:200])
    print()
