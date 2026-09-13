import os
import sys
import json
import time
import urllib.request
import subprocess
import argparse

# Configura console Windows para UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_KEYS = [
    "sk_5aa090dbd19357ec745274bdfe3c4fd0ea3173c5fb5acdeb", # Chave primária fornecida pelo usuário (10.000 caracteres)
    "sk_4e1e236ebcbb440102e1c940f72b03613714f4451eb0b186"  # Chave backup de alta cota (7.573 caracteres)
]

VOICE_CHRIS = "iP95p4xoKVk53GoZ742B" # Chris - Voz Oficial Canônica do Canal O Outro Lado
MODEL_ID = "eleven_multilingual_v2"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
key_idx = 0

def call_elevenlabs(text: str, raw_output_path: str) -> bool:
    global key_idx
    for _ in range(len(API_KEYS) * 2):
        current_key = API_KEYS[key_idx % len(API_KEYS)]
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_CHRIS}"
        headers = {
            "xi-api-key": current_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        body = json.dumps({
            "text": text,
            "model_id": MODEL_ID,
            "voice_settings": {
                "stability": 0.50,
                "similarity_boost": 0.85,
                "style": 0.15,
                "use_speaker_boost": True
            }
        }).encode("utf-8")

        try:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=45) as resp:
                if resp.status == 200:
                    with open(raw_output_path, "wb") as f:
                        f.write(resp.read())
                    return True
        except Exception as e:
            print(f"    ⚠️ Erro com chave {key_idx % len(API_KEYS)} ({current_key[:8]}...): {e}. Alternando...")
            key_idx += 1
            time.sleep(1.5)

    return False

def master_scene_audio(raw_mp3: str, final_mp3: str, target_seconds: float):
    # 1. Medir duração bruta
    probe_cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        raw_mp3
    ]
    raw_dur = float(subprocess.check_output(probe_cmd).decode('utf8').strip())

    # 2. Ajuste fino de andamento e masterização broadcast
    # Se a fala for maior que a janela útil da cena, acelera levemente até no máximo 1.15x
    tempo = max(0.95, min(1.15, raw_dur / (target_seconds - 0.4))) if raw_dur > (target_seconds - 0.4) else 1.0

    # Filtro: warm documentary EQ (corte de sub-graves <80Hz, corte cirúrgico de sibilância em 12kHz, compressão broadcast -18dB)
    if tempo != 1.0:
        audio_filter = f"atempo={tempo:.4f},highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=50,apad,atrim=0:{target_seconds:.3f}"
    else:
        audio_filter = f"highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=50,apad,atrim=0:{target_seconds:.3f}"

    ffmpeg_cmd = [
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-i', raw_mp3,
        '-af', audio_filter,
        '-ar', '44100', '-ac', '1',
        '-c:a', 'libmp3lame', '-b:a', '192k',
        final_mp3
    ]
    subprocess.check_call(ffmpeg_cmd)

    if os.path.exists(raw_mp3):
        os.remove(raw_mp3)

    final_probe = float(subprocess.check_output(probe_cmd[:-1] + [final_mp3]).decode('utf8').strip())
    return raw_dur, final_probe

def process_episode(episode_id: str):
    scenes_file = os.path.join(BASE_DIR, 'contracts', 'episodes', f'{episode_id}.scenes.json')
    out_dir = os.path.join(BASE_DIR, 'public', 'episodes', episode_id, 'audio', 'narration')
    os.makedirs(out_dir, exist_ok=True)

    with open(scenes_file, 'r', encoding='utf-8') as f:
        scenes = json.load(f)

    print(f"\n======================================================================")
    print(f"🎙️ SÍNTESE ELEVENLABS OFICIAL: {episode_id.upper()}")
    print(f"   Voz: Chris ({VOICE_CHRIS}) | Modelo: {MODEL_ID}")
    print(f"   Total de Cenas: {len(scenes)}")
    print(f"======================================================================")

    success_count = 0
    total_chars = 0

    for idx, sc in enumerate(scenes):
        sc_id = sc['sceneId']
        text = sc.get('voiceover', '').strip()
        target_sec = sc.get('targetSeconds', 10.0)
        final_mp3 = os.path.join(out_dir, f"{sc_id}.mp3")
        raw_mp3 = os.path.join(out_dir, f"{sc_id}_raw.mp3")

        print(f"[{idx+1:02d}/{len(scenes):02d}] Sintetizando {sc_id} ({len(text)} chars, alvo {target_sec}s)...")
        total_chars += len(text)

        ok = call_elevenlabs(text, raw_mp3)
        if not ok:
            print(f"  ❌ FALHA crítica na síntese ElevenLabs para {sc_id}!")
            continue

        raw_dur, final_dur = master_scene_audio(raw_mp3, final_mp3, target_sec)
        print(f"  ✅ Concluído: {final_dur:.2f}s (bruto: {raw_dur:.2f}s) -> {sc_id}.mp3")
        success_count += 1
        time.sleep(0.3)

    print(f"\n🎉 Episódio {episode_id} concluído com sucesso: {success_count}/{len(scenes)} cenas geradas ({total_chars} caracteres).")

def main():
    parser = argparse.ArgumentParser(description="Síntese ElevenLabs com a voz oficial Chris.")
    parser.add_argument("--episode", default="all", choices=["encomenda-china-curitiba", "diario-oficial-3-da-madrugada", "all"])
    args = parser.parse_args()

    if args.episode == "all":
        process_episode("encomenda-china-curitiba")
        process_episode("diario-oficial-3-da-madrugada")
    else:
        process_episode(args.episode)

if __name__ == "__main__":
    main()
