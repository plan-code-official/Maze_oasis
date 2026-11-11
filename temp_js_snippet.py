import pathlib
html = pathlib.Path('temp_itch_page.html').read_text('utf-8', errors='ignore')
needle = 'generate_download_url'
idx = html.find(needle)
print(html[idx-400:idx+1200])
