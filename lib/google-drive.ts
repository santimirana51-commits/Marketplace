import { google } from 'googleapis';
import { log } from '@/lib/logger';

export type DriveMeta = {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
};

function oauthClient() {
  const id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!id || !secret || !refresh) {
    throw new Error('Google Drive credentials not configured');
  }
  const oauth = new google.auth.OAuth2(id, secret);
  oauth.setCredentials({ refresh_token: refresh });
  return oauth;
}

function drive() {
  return google.drive({ version: 'v3', auth: oauthClient() });
}

/** Fetch metadata; throws DriveNotFound on 404. Never logs secrets. */
export async function getDriveFileMetadata(fileId: string): Promise<DriveMeta> {
  try {
    const res = await drive().files.get({
      fileId,
      fields: 'id,name,mimeType,size',
      supportsAllDrives: true,
    });
    const d = res.data;
    return {
      id: d.id!,
      name: d.name!,
      mimeType: d.mimeType ?? undefined,
      size: d.size ? Number(d.size) : undefined,
    };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 404) {
      const e = new Error('Drive file not found') as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    log('drive.metadata.error', { code });
    throw new Error('Failed to read Drive file metadata');
  }
}

/** Download file content as a web ReadableStream (serverless-safe streaming). */
export async function downloadDriveFileStream(fileId: string): Promise<{
  stream: ReadableStream<Uint8Array>;
  meta: DriveMeta;
}> {
  const meta = await getDriveFileMetadata(fileId);
  try {
    const res = await drive().files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    const nodeStream = res.data as unknown as NodeJS.ReadableStream;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (e) => controller.error(e));
      },
      cancel() {
        (nodeStream as { destroy?: () => void }).destroy?.();
      },
    });
    return { stream, meta };
  } catch (err) {
    log('drive.download.error', { fileId: fileId.slice(0, 8) + '…' });
    throw err instanceof Error ? err : new Error('Drive download failed');
  }
}

/** Admin helper: validate that a Drive file id exists before saving. */
export async function validateDriveFile(fileId: string) {
  return getDriveFileMetadata(fileId);
}

/** Spec-named aliases (original implementation, same secure behavior). */
export const getDriveFile = getDriveFileMetadata;
export const downloadDriveFile = downloadDriveFileStream;
