export interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
  pool_size: number;
  connect_timeout: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  default_ttl: number;
}

export interface JwtConfig {
  secret: string;
  expires_in: string;
  refresh_secret: string;
  refresh_expires_in: string;
}

export interface AppConfig {
  app: { port: number; prefix: string; cors_origin: string };
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
}
