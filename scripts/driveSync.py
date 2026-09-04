# -*- coding: utf-8 -*-
"""
Motor Canônico de Sincronização e Backup com Google Drive - O OUTRO LADO
Gerencia uploads resumíveis, checkpoints, restauração e liberação de espaço em disco.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = ROOT / 'config' / 'token.json'
CLIENT_SECRET_FILE = ROOT / 'config' / 'client_secret.json'
SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
]

DEFAULT_FOLDER_ID = '1LZ_9VGWrRrNAIQfmdQ-qrIoKakrLTwIH'
DEFAULT_FOLDER_NAME = 'o-outro-lado-canal'

def get_drive_service():
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Credencial token.json não encontrada em: {TOKEN_FILE}")

    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            with open(str(TOKEN_FILE), 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
        except Exception as e:
            print(f"[WARN] Erro ao renovar token: {e}", flush=True)

    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(service, folder_name, parent_id):
    query = f"mimeType = 'application/vnd.google-apps.folder' and name = '{folder_name}' and '{parent_id}' in parents and trashed = false"
    results = service.files().list(
        q=query,
        spaces='drive',
        fields='files(id, name)',
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']

    metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    created = service.files().create(
        body=metadata,
        fields='id',
        supportsAllDrives=True
    ).execute()
    print(f"📁 Pasta criada no Drive: {folder_name} (ID: {created.get('id')})", flush=True)
    return created.get('id')

def check_file_exists(service, file_name, parent_folder_id):
    query = f"name = '{file_name}' and '{parent_folder_id}' in parents and trashed = false"
    results = service.files().list(
        q=query,
        spaces='drive',
        fields='files(id, name, size, md5Checksum)',
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()
    files = results.get('files', [])
    return files[0] if files else None

def upload_single_file(service, local_file_path, parent_folder_id, force=False):
    path = Path(local_file_path)
    if not path.exists() or not path.is_file():
        return None

    file_size_bytes = path.stat().st_size
    file_size_mb = file_size_bytes / (1024 * 1024)

    existing = check_file_exists(service, path.name, parent_folder_id)

    if existing and not force:
        remote_size = int(existing.get('size', 0))
        if remote_size == file_size_bytes:
            print(f"⏭️  [Drive Hit] Já existe idêntico: {path.name} ({file_size_mb:.2f} MB)", flush=True)
            return existing['id']

    media = MediaFileUpload(str(path), resumable=True, chunksize=10 * 1024 * 1024)

    if existing:
        print(f"🔄 Atualizando no Drive: {path.name} ({file_size_mb:.2f} MB)...", flush=True)
        updated = service.files().update(
            fileId=existing['id'],
            media_body=media,
            supportsAllDrives=True
        ).execute()
        return updated.get('id')
    else:
        print(f"⬆️  Enviando para o Drive: {path.name} ({file_size_mb:.2f} MB)...", flush=True)
        created = service.files().create(
            body={'name': path.name, 'parents': [parent_folder_id]},
            media_body=media,
            fields='id',
            supportsAllDrives=True
        ).execute()
        print(f"✅ Concluído: {path.name}", flush=True)
        return created.get('id')

def upload_folder_recursive(service, local_dir_path, parent_folder_id, max_depth=5, current_depth=0):
    if current_depth > max_depth:
        return
    path = Path(local_dir_path)
    if not path.exists() or not path.is_dir():
        return

    dir_id = get_or_create_folder(service, path.name, parent_folder_id)
    for child in sorted(path.iterdir()):
        if child.name.startswith('.') or child.name in ['__pycache__', 'node_modules', '.venv']:
            continue
        if child.is_file():
            try:
                upload_single_file(service, child, dir_id)
            except Exception as e:
                print(f"❌ Erro ao enviar {child.name}: {e}", flush=True)
        elif child.is_dir():
            upload_folder_recursive(service, child, dir_id, max_depth, current_depth + 1)

def sync_deliveries(service, root_folder_id):
    runs_dir = ROOT / 'runs'
    if not runs_dir.exists():
        return
    print("\n" + "="*70)
    print("🎬 01_DELIVERIES: SINCRONIZANDO VÍDEOS MASTER E PACOTES FINAIS")
    print("="*70)
    deliv_folder = get_or_create_folder(service, '01_DELIVERIES', root_folder_id)

    for run_path in sorted(runs_dir.iterdir()):
        if not run_path.is_dir() or run_path.name.startswith('.'):
            continue

        # Procura final_master
        master_candidates = list(run_path.glob('final_master*.mp4')) + list(run_path.glob('*/final_master*.mp4'))
        if not master_candidates:
            continue

        ep_folder = get_or_create_folder(service, run_path.name, deliv_folder)
        for master in master_candidates:
            upload_single_file(service, master, ep_folder)

        # Thumbnails e metadados de publicação
        for pat in ['thumbnail*.png', 'thumbnail*.jpg', '*metadata*.json', 'render_manifest.json']:
            for asset in list(run_path.glob(pat)) + list(run_path.glob(f'*/{pat}')):
                upload_single_file(service, asset, ep_folder)

def sync_saves(service, root_folder_id):
    runs_dir = ROOT / 'runs'
    if not runs_dir.exists():
        return
    print("\n" + "="*70)
    print("💾 03_EPISODE_SAVES: SINCRONIZANDO CONTRATOS, ROTEIROS E ÁUDIOS MASTER")
    print("="*70)
    saves_folder = get_or_create_folder(service, '03_EPISODE_SAVES', root_folder_id)

    for run_path in sorted(runs_dir.iterdir()):
        if not run_path.is_dir() or run_path.name.startswith('.'):
            continue

        # Arquivos essenciais de save
        save_files = [
            'run-manifest.json',
            'scene-plan.json',
            'audio-plan.json',
            'audio/narration.mp3',
            'narration_master.wav',
            'scene_timings.json'
        ]

        found_saves = []
        for sf in save_files:
            p = run_path / sf
            if p.exists() and p.is_file():
                found_saves.append(p)

        if found_saves:
            ep_target = get_or_create_folder(service, run_path.name, saves_folder)
            for f in found_saves:
                upload_single_file(service, f, ep_target)

def sync_assets(service, root_folder_id):
    assets_dir = ROOT / 'assets'
    if not assets_dir.exists():
        return
    print("\n" + "="*70)
    print("🎵 02_ASSETS_CENTRAL: SINCRONIZANDO BIBLIOTECA CENTRAL DE ASSETS")
    print("="*70)
    assets_target = get_or_create_folder(service, '02_ASSETS_CENTRAL', root_folder_id)

    # 1. Audio Library (soundtracks, ambient)
    audio_lib = assets_dir / 'audio_library'
    if audio_lib.exists():
        print("  -> Sincronizando audio_library...")
        upload_folder_recursive(service, audio_lib, assets_target)

    # 2. Soundfx
    sfx = assets_dir / 'soundfx'
    if sfx.exists():
        print("  -> Sincronizando soundfx...")
        upload_folder_recursive(service, sfx, assets_target)

    # 3. Video Repository
    vid_repo = assets_dir / 'video_repository'
    if vid_repo.exists():
        print("  -> Sincronizando video_repository...")
        upload_folder_recursive(service, vid_repo, assets_target)

    # 4. Image Repository
    img_repo = assets_dir / 'image_repository'
    if img_repo.exists():
        print("  -> Sincronizando image_repository...")
        upload_folder_recursive(service, img_repo, assets_target)

def sync_registry(service, root_folder_id):
    print("\n" + "="*70)
    print("📚 04_DATABASE_REGISTRY: SINCRONIZANDO REGISTRO CANÔNICO E CATÁLOGOS")
    print("="*70)
    reg_folder = get_or_create_folder(service, '04_DATABASE_REGISTRY', root_folder_id)

    # Artifact registry
    for candidate in [ROOT / 'runs' / 'artifact_registry.json', ROOT / 'database' / 'video_bank.db']:
        if candidate.exists() and candidate.is_file():
            upload_single_file(service, candidate, reg_folder)

    # Catalogos de video e imagem se existirem
    for cat in (ROOT / 'assets').glob('*catalog*.json'):
        upload_single_file(service, cat, reg_folder)

def sync_single_episode(service, root_folder_id, episode_id):
    print(f"\n🚀 [Auto-Save Episode] Sincronizando episódio '{episode_id}' com Google Drive...", flush=True)
    run_path = ROOT / 'runs' / episode_id
    if not run_path.exists():
        # Tenta buscar por case insensitive
        for d in (ROOT / 'runs').iterdir():
            if d.name.lower() == episode_id.lower():
                run_path = d
                break

    if not run_path.exists():
        print(f"❌ Episódio '{episode_id}' não encontrado em runs/")
        return False

    # 1. Delivery
    deliv_folder = get_or_create_folder(service, '01_DELIVERIES', root_folder_id)
    ep_deliv = get_or_create_folder(service, run_path.name, deliv_folder)
    for m in list(run_path.glob('final_master*.mp4')) + list(run_path.glob('*/final_master*.mp4')):
        upload_single_file(service, m, ep_deliv)
    for pat in ['thumbnail*.png', 'thumbnail*.jpg', '*metadata*.json', 'render_manifest.json']:
        for asset in list(run_path.glob(pat)) + list(run_path.glob(f'*/{pat}')):
            upload_single_file(service, asset, ep_deliv)

    # 2. Saves
    saves_folder = get_or_create_folder(service, '03_EPISODE_SAVES', root_folder_id)
    ep_saves = get_or_create_folder(service, run_path.name, saves_folder)
    for sf in ['run-manifest.json', 'scene-plan.json', 'audio-plan.json', 'audio/narration.mp3', 'narration_master.wav', 'scene_timings.json']:
        p = run_path / sf
        if p.exists() and p.is_file():
            upload_single_file(service, p, ep_saves)

    # 3. Registry
    sync_registry(service, root_folder_id)
    print(f"🎉 Episódio '{episode_id}' sincronizado com sucesso no Google Drive!", flush=True)
    return True

def clean_local(service, root_folder_id, dry_run=True):
    print("\n" + "="*70)
    print(f"🧹 AUDITORIA DE LIMPEZA E DESAFOGAMENTO DE DISCO (Dry-Run: {dry_run})")
    print("="*70)

    # 1. Remotion bundles e caches transitórios
    remotion_bundle = ROOT / '.remotion-bundle'
    remotion_size = 0
    if remotion_bundle.exists():
        for f in remotion_bundle.glob('**/*'):
            if f.is_file():
                remotion_size += f.stat().st_size

    print(f"- Cache .remotion-bundle: {remotion_size / (1024*1024):.2f} MB")
    if not dry_run and remotion_bundle.exists():
        import shutil
        shutil.rmtree(str(remotion_bundle), ignore_errors=True)
        print("  -> .remotion-bundle removido!")

    # 2. Intermediários em runs (chunk_*.mp4, temp_*)
    runs_dir = ROOT / 'runs'
    chunks_cleaned = 0
    chunks_bytes = 0
    if runs_dir.exists():
        for chunk in runs_dir.glob('**/chunk_*.mp4'):
            if chunk.is_file():
                chunks_cleaned += 1
                chunks_bytes += chunk.stat().st_size
                if not dry_run:
                    try:
                        chunk.unlink()
                    except Exception as e:
                        print(f"  Erro ao remover {chunk.name}: {e}")

    print(f"- Chunks intermediários de render: {chunks_cleaned} arquivos ({chunks_bytes / (1024*1024):.2f} MB)")
    if not dry_run and chunks_cleaned > 0:
        print("  -> Chunks intermediários removidos!")

    total_mb_freed = (remotion_size + chunks_bytes) / (1024 * 1024)
    print(f"\n📊 Total de espaço liberado/recuperável imediato: {total_mb_freed:.2f} MB ({total_mb_freed/1024:.2f} GB)")

def check_status(service, root_folder_id):
    print("\n" + "="*70)
    print(f"📡 CONEXÃO COM GOOGLE DRIVE: {DEFAULT_FOLDER_NAME} (ID: {root_folder_id})")
    print("="*70)
    folder = service.files().get(fileId=root_folder_id, fields='id, name, mimeType', supportsAllDrives=True).execute()
    print(f"✅ Pasta Raiz Ativa: {folder.get('name')} (ID: {folder.get('id')})")

    res = service.files().list(
        q=f"'{root_folder_id}' in parents and trashed = false",
        fields='files(id, name, mimeType)',
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()

    items = res.get('files', [])
    print(f"📂 Subpastas / Arquivos Existentes ({len(items)}):")
    for it in items:
        print(f"   - [{it.get('mimeType')}] {it.get('name')} (ID: {it.get('id')})")

def main():
    parser = argparse.ArgumentParser(description="Google Drive Sync Engine para O Outro Lado")
    parser.add_argument('--folder-id', default=DEFAULT_FOLDER_ID, help="Google Drive Root Folder ID")
    parser.add_argument('--action', choices=[
        'status', 'backup-all', 'sync-deliveries', 'sync-saves',
        'sync-assets', 'sync-registry', 'sync-episode', 'clean-local'
    ], default='status')
    parser.add_argument('--episode-id', help="ID do episódio para sync específico")
    parser.add_argument('--dry-run', action='store_true', help="Apenas simular sem deletar arquivos")
    args = parser.parse_args()

    service = get_drive_service()
    root_id = args.folder_id

    if args.action == 'status':
        check_status(service, root_id)
    elif args.action == 'backup-all':
        sync_deliveries(service, root_id)
        sync_saves(service, root_id)
        sync_assets(service, root_id)
        sync_registry(service, root_id)
        print("\n🎉 Backup completo no Google Drive concluído com sucesso!", flush=True)
    elif args.action == 'sync-deliveries':
        sync_deliveries(service, root_id)
    elif args.action == 'sync-saves':
        sync_saves(service, root_id)
    elif args.action == 'sync-assets':
        sync_assets(service, root_id)
    elif args.action == 'sync-registry':
        sync_registry(service, root_id)
    elif args.action == 'sync-episode':
        if not args.episode_id:
            print("❌ Especifique --episode-id")
            sys.exit(1)
        sync_single_episode(service, root_id, args.episode_id)
    elif args.action == 'clean-local':
        clean_local(service, root_id, dry_run=args.dry_run)

if __name__ == '__main__':
    main()