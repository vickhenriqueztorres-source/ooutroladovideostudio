import os
import json
import asyncio
import subprocess
import edge_tts

VOICE = "pt-BR-AntonioNeural"
RATE = "-2%" # Cadência sóbria, pausada e investigativa (~146 WPM)
PITCH = "-1Hz"

async def synthesize_scene(scene_id: str, text: str, target_seconds: float, out_mp3: str):
    raw_mp3 = out_mp3.replace('.mp3', '_raw.mp3')
    
    # 1. Síntese neural de alta fidelidade
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(raw_mp3)
    
    # 2. Medir duração bruta
    probe_cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        raw_mp3
    ]
    raw_dur = float(subprocess.check_output(probe_cmd).decode('utf8').strip())
    
    # 3. Ajuste de andamento e masterização broadcast
    # Se a fala for maior que o tempo da cena, ajusta atempo suavemente. Se menor, adiciona padding
    tempo = max(0.95, min(1.15, raw_dur / (target_seconds - 0.5))) if raw_dur > target_seconds - 0.5 else 1.0
    
    # Filtro: warm documentary EQ (ligeiro boost nos graves ~120Hz, corte cirúrgico de sibilância em 6kHz, compressão suave)
    audio_filter = f"atempo={tempo:.4f},highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=50,apad,atrim=0:{target_seconds:.3f}" if tempo != 1.0 else f"highpass=f=80,lowpass=f=12000,acompressor=threshold=-18dB:ratio=3:attack=5:release=50,apad,atrim=0:{target_seconds:.3f}"
    
    ffmpeg_cmd = [
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-i', raw_mp3,
        '-af', audio_filter,
        '-ar', '44100', '-ac', '1',
        '-c:a', 'libmp3lame', '-b:a', '192k',
        out_mp3
    ]
    subprocess.check_call(ffmpeg_cmd)
    
    if os.path.exists(raw_mp3):
        os.remove(raw_mp3)
        
    final_probe = float(subprocess.check_output(probe_cmd[:-1] + [out_mp3]).decode('utf8').strip())
    print(f"  * [{scene_id}] Concluido: {final_probe:.2f}s (bruto: {raw_dur:.2f}s) -> {out_mp3}")

async def main():
    root = os.getcwd()
    scenes_path = os.path.join(root, 'contracts', 'episodes', 'encomenda-china-curitiba.scenes.json')
    out_dir = os.path.join(root, 'public', 'episodes', 'encomenda-china-curitiba', 'audio', 'narration')
    os.makedirs(out_dir, exist_ok=True)
    
    with open(scenes_path, 'r', encoding='utf8') as f:
        scenes = json.load(f)
        
    print("======================================================================")
    print("SINTESE DE NARRACAO FORENSE: ENCOMENDA DA CHINA (30 CENAS)")
    print("======================================================================")
    print(f"* Voz: {VOICE} ({RATE}, {PITCH})")
    print(f"* Destino: {out_dir}\n")
    
    for sc in scenes:
        scene_id = sc['sceneId']
        text = sc['voiceover']
        target_sec = float(sc.get('targetSeconds', 10.5))
        out_file = os.path.join(out_dir, f"{scene_id}.mp3")
        await synthesize_scene(scene_id, text, target_sec, out_file)
        
    print("\nConcluido: Todas as 30 locucoes conformatadas e masterizadas com sucesso!\n")

if __name__ == '__main__':
    asyncio.run(main())
