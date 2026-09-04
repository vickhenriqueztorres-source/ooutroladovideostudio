import path from 'path';
import { spawn } from 'child_process';
import { GOOGLE_DRIVE_CONFIG } from '../config/googleDriveConfig';

export interface DriveSyncOptions {
  action?: 'status' | 'backup-all' | 'sync-deliveries' | 'sync-saves' | 'sync-assets' | 'sync-registry' | 'sync-episode' | 'clean-local';
  episodeId?: string;
  dryRun?: boolean;
  folderId?: string;
}

export class DriveSyncBridge {
  private static scriptPath = path.resolve(__dirname, 'driveSync.py');

  public static async execute(options: DriveSyncOptions = {}): Promise<number> {
    const action = options.action || 'status';
    const folderId = options.folderId || GOOGLE_DRIVE_CONFIG.FOLDER_ID;

    const args: string[] = [
      this.scriptPath,
      '--action', action,
      '--folder-id', folderId
    ];

    if (options.episodeId) {
      args.push('--episode-id', options.episodeId);
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    console.log(`\n[DRIVE_BRIDGE] Executando Google Drive Sync: ${action}...`);

    return new Promise((resolve, reject) => {
      const child = spawn('python', args, {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`DRIVE_SYNC_FAILED with exit code ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  public static async autoUploadEpisode(episodeId: string): Promise<void> {
    if (!GOOGLE_DRIVE_CONFIG.AUTO_UPLOAD_ON_COMPLETION) {
      console.log(`[DRIVE_BRIDGE] Auto-upload desativado para ${episodeId}.`);
      return;
    }

    console.log(`\n[DRIVE_BRIDGE] 🚀 Iniciando Auto-Upload do Episódio ${episodeId} para o Google Drive...`);
    try {
      await this.execute({
        action: 'sync-episode',
        episodeId
      });
      console.log(`[DRIVE_BRIDGE] ✅ Episódio ${episodeId} salvo no Google Drive!`);
    } catch (err: any) {
      console.error(`[DRIVE_BRIDGE] ⚠️ Falha no auto-upload do episódio ${episodeId}:`, err.message);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const actionArg = (args[0] as DriveSyncOptions['action']) || 'status';
  let episodeId: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' || args[i] === '-e') {
      episodeId = args[i + 1];
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  await DriveSyncBridge.execute({
    action: actionArg,
    episodeId,
    dryRun
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}