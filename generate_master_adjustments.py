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

def clean_sanskrit_length(line):
    cleaned = re.sub(r'[\s।॥\d\.,]', '', line)
    return max(len(cleaned), 1)

def compute_initial_padas(start, end, dev_lines):
    duration = end - start
    weights = [clean_sanskrit_length(dev_lines[i]) if i < len(dev_lines) else 10 for i in range(4)]
    
    # Sanskrit cadence weighting: pause after pada 2, elongation on pada 4
    weights[1] *= 1.06
    weights[3] *= 1.12

    total_weight = sum(weights)
    ratios = [w / total_weight for w in weights]

    padas = []
    accum = start
    for i in range(4):
        p_start = accum
        p_end = end if i == 3 else round(accum + (duration * ratios[i]), 2)
        padas.append({
            'padaIndex': i + 1,
            'start': round(p_start, 2),
            'end': round(p_end, 2)
        })
        accum = p_end
    return padas

def generate_master(num):
    padded = f"{num:03d}"
    vtt_name = f"Narayaneeyam_D{padded}.vtt"
    vtt_path = os.path.join(REPO_BASIC, 'vtt_fixed_output_time', vtt_name)
    blocks = parse_vtt(vtt_path)

    master = {}
    for idx, b in enumerate(blocks):
        shloka_num = idx + 1
        key = f"d{num}_s{shloka_num}"
        dev_lines = b['lines'][:4]
        master[key] = compute_initial_padas(b['start'], b['end'], dev_lines)

    return master

os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
master_data = generate_master(1)

out_file = os.path.join(BASE_DIR, 'data', 'adjustments.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(master_data, f, ensure_ascii=False, indent=2)

print(f"Master adjustments file created at: {out_file}")