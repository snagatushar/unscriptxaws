import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { google } from 'googleapis';

type FolderResult = {
  eventTitle: string;
  folderId: string;
};

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive'];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
    requiredEnv('GOOGLE_REDIRECT_URI')
  );
  auth.setCredentials({
    refresh_token: requiredEnv('GOOGLE_REFRESH_TOKEN'),
  });
  auth.on('tokens', (tokens) => {
    if (tokens.access_token) {
      console.log('Refreshed access token in script runtime.');
    }
  });
  return google.drive({ version: 'v3', auth });
}

function parseEvents(): string[] {
  const raw = requiredEnv('DRIVE_EVENT_TITLES_JSON');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('DRIVE_EVENT_TITLES_JSON must be a non-empty JSON array');
  }
  return parsed.map((item) => String(item).trim()).filter(Boolean);
}

async function createFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string
) {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id,name',
  });

  if (!response.data.id) {
    throw new Error(`Failed to create folder for "${name}"`);
  }

  return response.data.id;
}

async function main() {
  const drive = getDriveClient();
  const parentFolderId = requiredEnv('GDRIVE_EVENTS_PARENT_FOLDER_ID');
  const eventTitles = parseEvents();
  const results: FolderResult[] = [];

  for (const title of eventTitles) {
    const folderId = await createFolder(drive, title, parentFolderId);
    results.push({ eventTitle: title, folderId });
    console.log(`Created folder: ${title} -> ${folderId}`);
  }

  const map = Object.fromEntries(results.map((row) => [row.eventTitle, row.folderId]));
  const outputDir = resolve(process.cwd(), 'drive-config');
  const outputPath = resolve(outputDir, 'event-folder-map.json');

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(map, null, 2), 'utf8');

  console.log('\nGenerated config file:');
  console.log(outputPath);
  console.log('\nSet this as Vercel env var: GDRIVE_EVENT_FOLDER_MAP_JSON');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
