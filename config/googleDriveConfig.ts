export const GOOGLE_DRIVE_CONFIG = {
  FOLDER_ID: '1LZ_9VGWrRrNAIQfmdQ-qrIoKakrLTwIH',
  FOLDER_NAME: 'o-outro-lado-canal',
  SCOPES: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ],
  SUBFOLDERS: {
    DELIVERIES: '01_DELIVERIES',
    ASSETS_CENTRAL: '02_ASSETS_CENTRAL',
    EPISODE_SAVES: '03_EPISODE_SAVES',
    DATABASE_REGISTRY: '04_DATABASE_REGISTRY'
  },
  CHUNK_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB resumable upload chunk
  AUTO_UPLOAD_ON_COMPLETION: true
};