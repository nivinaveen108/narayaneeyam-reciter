import os
import re
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_BASIC = os.path.abspath(os.path.join(BASE_DIR, '..', 'narayaneeyam_basic'))

def parse_time(time_str):
    parts = time_str.strip().split(':')
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

def parse_vtt(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    regex = r'(?:(\d+)\r?\n)?(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n(?:\d+|\d{2}:)|$))'
    blocks = []
    for m in re.finditer(regex, content):
        lines = [l.strip() for l in m.group(4).splitlines() if l.strip()]
        blocks.append({
            'start': parse_time(m.group(2)),
            'end': parse_time(m.group(3)),
            'lines': lines
        })
    return blocks

title_path = os.path.join(REPO_BASIC, 'title_and_meter.json')
titles_data = []
if os.path.exists(title_path):
    with open(title_path, 'r', encoding='utf-8') as f:
        titles_data = json.load(f)

# Load the master adjustments file
adj_path = os.path.join(BASE_DIR, 'data', 'adjustments.json')
master_adjustments = {}
if os.path.exists(adj_path):
    with open(adj_path, 'r', encoding='utf-8') as f:
        master_adjustments = json.load(f)

def process_dashakam(num):
    padded = f"{num:03d}"
    vtt_name = f"Narayaneeyam_D{padded}.vtt"

    dev = parse_vtt(os.path.join(REPO_BASIC, 'vtt_fixed_output_time', vtt_name))
    iast = parse_vtt(os.path.join(REPO_BASIC, 'vtt_fixed_time_transliterated', vtt_name))
    mal = parse_vtt(os.path.join(REPO_BASIC, 'vtt_time_malayalam_translated', vtt_name))
    tam = parse_vtt(os.path.join(REPO_BASIC, 'vtt_time_devanagari_tamil', vtt_name))

    if not dev:
        return None

    shlokas = []
    for idx, dev_b in enumerate(dev):
        iast_b = iast[idx] if idx < len(iast) else {'lines': []}
        mal_b = mal[idx] if idx < len(mal) else {'lines': []}
        tam_b = tam[idx] if idx < len(tam) else {'lines': []}

        shloka_num = idx + 1
        key = f"d{num}_s{shloka_num}"

        # Use master adjustment if present; otherwise default to equal split
        if key in master_adjustments:
            padas = master_adjustments[key]
        else:
            start = dev_b['start']
            end = dev_b['end']
            step = (end - start) / 4.0
            padas = [{
                'padaIndex': p + 1,
                'start': round(start + p * step, 2),
                'end': round(start + (p + 1) * step, 2)
            } for p in range(4)]

        shlokas.append({
            'shloka': shloka_num,
            'start': dev_b['start'],
            'end': dev_b['end'],
            'scripts': {
                'devanagari': dev_b['lines'][:4],
                'iast': iast_b['lines'][:4],
                'malayalam': mal_b['lines'][:4],
                'tamil': tam_b['lines'][4:8] if len(tam_b['lines']) >= 8 else []
            },
            'padas': padas,
            'meanings': {
                'english': dev_b['lines'][-1] if dev_b['lines'] else '',
                'malayalam': mal_b['lines'][-1] if mal_b['lines'] else ''
            }
        })

    meta = next((t for t in titles_data if t.get('number') == num), {})
    return {
        'dashakam': num,
        'titleSanskrit': meta.get('sanskrit_title', ''),
        'titleEnglish': meta.get('english_title', ''),
        'audioPath': f"audio/Narayaneeyam_D{padded}.mp3",
        'shlokas': shlokas
    }

d1 = process_dashakam(1)
out_file = os.path.join(BASE_DIR, 'data', 'dashakam_01.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(d1, f, ensure_ascii=False, indent=2)

print("dashakam_01.json updated from master adjustments.")