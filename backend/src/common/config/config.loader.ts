import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override ?? {})) {
    result[key] =
      typeof override[key] === 'object' && !Array.isArray(override[key])
        ? deepMerge(base[key] ?? {}, override[key])
        : override[key];
  }
  return result;
}

function readYaml(filePath: string): Record<string, any> {
  if (!fs.existsSync(filePath)) return {};
  return (yaml.load(fs.readFileSync(filePath, 'utf8')) as Record<string, any>) ?? {};
}

export function loadConfig(): Record<string, any> {
  const root = path.resolve(process.cwd());
  const base = readYaml(path.join(root, 'config.yml'));
  const local = readYaml(path.join(root, 'config.local.yml'));

  // Biến môi trường override mọi thứ (ưu tiên cao nhất)
  const merged = deepMerge(base, local);

  // Cho phép override từng field qua env var
  const db = merged.database ?? {};
  if (process.env.DATABASE_HOST) db.host = process.env.DATABASE_HOST;
  if (process.env.DATABASE_PORT) db.port = Number(process.env.DATABASE_PORT);
  if (process.env.DATABASE_USER) db.username = process.env.DATABASE_USER;
  if (process.env.DATABASE_PASSWORD) db.password = process.env.DATABASE_PASSWORD;
  if (process.env.DATABASE_NAME) db.name = process.env.DATABASE_NAME;
  if (process.env.DATABASE_SSL) db.ssl = process.env.DATABASE_SSL === 'true';
  merged.database = db;

  const redis = merged.redis ?? {};
  if (process.env.REDIS_HOST) redis.host = process.env.REDIS_HOST;
  if (process.env.REDIS_PORT) redis.port = Number(process.env.REDIS_PORT);
  if (process.env.REDIS_PASSWORD) redis.password = process.env.REDIS_PASSWORD;
  merged.redis = redis;

  const jwt = merged.jwt ?? {};
  if (process.env.JWT_SECRET) jwt.secret = process.env.JWT_SECRET;
  if (process.env.JWT_REFRESH_SECRET) jwt.refresh_secret = process.env.JWT_REFRESH_SECRET;
  merged.jwt = jwt;

  return merged;
}
