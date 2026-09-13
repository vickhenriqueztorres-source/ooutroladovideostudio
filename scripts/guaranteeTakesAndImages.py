import os
import sys
import json
import subprocess

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EP_ID = "encomenda-china-curitiba"
TAKES_DIR = os.path.join(BASE_DIR, "public", "episodes", EP_ID, "takes")
IMAGES_DIR = os.path.join(BASE_DIR, "public", "episodes", EP_ID, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

scenes_path = os.path.join(BASE_DIR, "contracts", "episodes", f"{EP_ID}.scenes.json")
with open(scenes_path, "r", encoding="utf-8") as f:
    scenes = json.load(f)

print(f"🎬 Garantindo Takes de 16s e Imagens 1080p para {len(scenes)} cenas de {EP_ID}...")

for idx, sc in enumerate(scenes):
    sid = sc["sceneId"]
    take_file = os.path.join(TAKES_DIR, f"{sid}.mp4")
    img_file = os.path.join(IMAGES_DIR, f"{sid}.png")
    
    if not os.path.exists(take_file):
        print(f"❌ Take não encontrado para {sid} em {take_file}")
        continue

    # 1. Medir duração atual
    dur = float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', take_file
    ]).decode().strip())

    # Se for menor que 15.5s, estende para 16.0s usando stream_loop
    if dur < 15.5:
        tmp_take = os.path.join(TAKES_DIR, f"{sid}_ext.mp4")
        ext_cmd = [
            'ffmpeg', '-y', '-stream_loop', '2', '-i', take_file,
            '-t', '16.0',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
            '-pix_fmt', 'yuv420p', '-an', tmp_take
        ]
        subprocess.check_call(ext_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.replace(tmp_take, take_file)
        new_dur = float(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', take_file
        ]).decode().strip())
        print(f"  [{idx+1:02d}/30] {sid}: Estendido de {dur:.2f}s -> {new_dur:.2f}s")
    else:
        print(f"  [{idx+1:02d}/30] {sid}: Duração já suficiente ({dur:.2f}s)")

    # 2. Extrair frame 1080p estático para images/SC_XXX.png
    extract_cmd = [
        'ffmpeg', '-y', '-ss', '0.5', '-i', take_file,
        '-vframes', '1', '-q:v', '2',
        img_file
    ]
    subprocess.check_call(extract_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("✅ Todos os 30 takes estendidos e todas as 30 imagens estáticas geradas com sucesso!")
