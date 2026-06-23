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
  const sqlPath = filepath.replace(/\.gz$/, "");

  try {
    await execFileAsync(
      "pg_dump",
      ["--dbname", databaseUrl, "--no-owner", "--no-acl", "-f", sqlPath],
      { maxBuffer: 10 * 1024 * 1024 },
    );
    await execFileAsync("gzip", ["-f", sqlPath]);
  } catch (error) {
    await fs.unlink(sqlPath).catch(() => undefined);
    await fs.unlink(filepath).catch(() => undefined);
    const detail =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: string }).stderr ?? "").trim()
        : "";
    throw new Error(detail || (error instanceof Error ? error.message : "pg_dump failed."));
  }

  const stat = await fs.stat(filepath);
  if (stat.size < 512) {
    const sample = await fs.readFile(filepath);
    await fs.unlink(filepath).catch(() => undefined);
    throw new Error(
      `Backup file too small (${stat.size} bytes) — pg_dump likely failed. Sample: ${sample.toString("hex").slice(0, 40)}`,
    );
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
