import os
import re
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_BASIC = os.path.abspath(os.path.join(BASE_DIR, '..', 'narayaneeyam_basic'))
DATA_DIR = os.path.join(BASE_DIR, 'data')

os.makedirs(DATA_DIR, exist_ok=True)

def parse_time(time_str):
    parts = time_str.strip().split(':')
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

def parse_vtt(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    regex = r'(?:(\w+)\r?\n)?(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})[^\r\n]*\r?\n([\s\S]*?)(?=(?:\r?\n\r?\n(?:[\w]+|\d{2}:)|$))'
    blocks = []
    for m in re.finditer(regex, content):
        lines = [l.strip() for l in m.group(4).splitlines() if l.strip()]
        blocks.append({
            'start': parse_time(m.group(2)),
            'end': parse_time(m.group(3)),
            'lines': lines
        })
    return blocks

def parse_split_words(raw_lines):
    if len(raw_lines) <= 5:
        return []
    splits = []
    for line in raw_lines[4:-1]:
        parts = re.split(r'\s{2,}|\t+', line, maxsplit=1)
        if len(parts) == 2:
            splits.append({'word': parts[0].strip(), 'meaning': parts[1].strip()})
        elif ' ' in line:
            w, m = line.split(' ', 1)
            splits.append({'word': w.strip(), 'meaning': m.strip()})
    return splits

# Load titles and meters metadata
title_path = os.path.join(REPO_BASIC, 'title_and_meter.json')
titles_data = []
if os.path.exists(title_path):
    with open(title_path, 'r', encoding='utf-8') as f:
        titles_data = json.load(f)

# Load adjustments if present
adj_path = os.path.join(DATA_DIR, 'adjustments.json')
master_adjustments = {}
if os.path.exists(adj_path):
    with open(adj_path, 'r', encoding='utf-8') as f:
        master_adjustments = json.load(f)

def process_dashakam(num):
    padded = f"{num:03d}"
    vtt_name = f"Narayaneeyam_D{padded}.vtt"

    dev_path = os.path.join(REPO_BASIC, 'vtt_fixed_output_time', vtt_name)
    if not os.path.exists(dev_path):
        return None

    dev = parse_vtt(dev_path)
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

        dev_text = dev_b['lines'][:4]
        iast_text = iast_b['lines'][:4]
        mal_text = mal_b['lines'][:4]
        tam_text = tam_b['lines'][4:8] if len(tam_b['lines']) >= 8 else []

        split_dev = parse_split_words(dev_b['lines'])
        split_iast = parse_split_words(iast_b['lines']) if iast_b['lines'] else []
        eng_meaning = dev_b['lines'][-1] if len(dev_b['lines']) > 4 else ''
        mal_meaning = mal_b['lines'][-1] if len(mal_b['lines']) > 4 else ''

        shlokas.append({
            'shloka': shloka_num,
            'start': dev_b['start'],
            'end': dev_b['end'],
            'scripts': {
                'devanagari': dev_text,
                'iast': iast_text,
                'malayalam': mal_text,
                'tamil': tam_text
            },
            'padas': padas,
            'splitMeanings': {
                'devanagari': split_dev,
                'iast': split_iast
            },
            'meanings': {
                'english': eng_meaning,
                'malayalam': mal_meaning
            }
        })

    meta = next((t for t in titles_data if t.get('number') == num), {})
    return {
        'dashakam': num,
        'titleSanskrit': meta.get('sanskrit_title', f"दशकम् {num}"),
        'titleEnglish': meta.get('english_title', f"Dashakam {num}"),
        'audioPath': f"audio/Narayaneeyam_D{padded}.mp3",
        'shlokas': shlokas
    }

print("Generating all available Dashakam JSON files...")
index_list = []

for d in range(1, 101):
    data = process_dashakam(d)
    if data:
        filename = f"dashakam_{d:02d}.json"
        with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        index_list.append({
            'number': d,
            'file': filename,
            'sanskrit': data['titleSanskrit'],
            'english': data['titleEnglish'],
            'shlokaCount': len(data['shlokas'])
        })
        print(f"Processed Dashakam {d:03d} ({len(data['shlokas'])} shlokas)")

# Write manifest index
index_file = os.path.join(DATA_DIR, 'dashakams_index.json')
with open(index_file, 'w', encoding='utf-8') as f:
    json.dump(index_list, f, ensure_ascii=False, indent=2)

print(f"\nDone! Generated {len(index_list)} Dashakam files and index: {index_file}")