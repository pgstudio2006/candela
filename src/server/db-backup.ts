import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DatabaseBackupResult = {
  filename: string;
  filepath: string;
  sizeBytes: number;
  retained: number;
  pruned: number;
};

async function listBackupFiles(backupDir: string) {
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql.gz"))
    .map((entry) => entry.name);
  const withStats = await Promise.all(
    files.map(async (name) => {
      const filepath = path.join(backupDir, name);
      const stat = await fs.stat(filepath);
      return { name, filepath, mtimeMs: stat.mtimeMs, sizeBytes: stat.size };
    }),
  );
  return withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

async function pruneOldBackups(backupDir: string, retentionDays: number) {
  const keepMs = Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - keepMs;
  const files = await listBackupFiles(backupDir);
  let pruned = 0;
  for (const file of files) {
    if (file.mtimeMs >= cutoff) continue;
    await fs.unlink(file.filepath).catch(() => undefined);
    pruned += 1;
  }
  return { retained: files.length - pruned, pruned };
}

export async function runDatabaseBackup(): Promise<DatabaseBackupResult> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const backupDir = process.env.BACKUP_DIR?.trim() || "/data/backups";
  await fs.mkdir(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `candela-${stamp}.sql.gz`;
  const filepath = path.join(backupDir, filename);

  await execFileAsync(
    "sh",
    ["-c", `pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$BACKUP_FILE"`],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        BACKUP_FILE: filepath,
      },
    },
  );

  const stat = await fs.stat(filepath);
  if (!stat.size) {
    await fs.unlink(filepath).catch(() => undefined);
    throw new Error("Backup file is empty — check DATABASE_URL and pg_dump access.");
  }

  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);
  const { retained, pruned } = await pruneOldBackups(backupDir, retentionDays);

  return {
    filename,
    filepath,
    sizeBytes: stat.size,
    retained,
    pruned,
  };
}

export async function listDatabaseBackups() {
  const backupDir = process.env.BACKUP_DIR?.trim() || "/data/backups";
  try {
    const files = await listBackupFiles(backupDir);
    return files.map((file) => ({
      filename: file.name,
      sizeBytes: file.sizeBytes,
      createdAt: new Date(file.mtimeMs).toISOString(),
    }));
  } catch {
    return [];
  }
}
