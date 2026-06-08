import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '../config/app.config';
import { PrismaService } from './prisma.service';
import { DATABASE_URL } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_URL,
      useFactory: (config: ConfigService) => {
        const db = config.get<DatabaseConfig>('database');
        return buildDatabaseUrl(db!);
      },
      inject: [ConfigService],
    },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}

/**
 * Build Prisma-compatible connection URL từ config.yml.
 * Thêm case mới đây nếu cần swap sang MySQL, Oracle, MSSQL...
 */
function buildDatabaseUrl(db: DatabaseConfig): string {
  const auth = db.password
    ? `${encodeURIComponent(db.username)}:${encodeURIComponent(db.password)}`
    : encodeURIComponent(db.username);

  const sslParam = db.ssl ? '?sslmode=require' : '';

  switch (db.type) {
    case 'postgresql':
    case 'postgres':
      return `postgresql://${auth}@${db.host}:${db.port}/${db.name}${sslParam}`;

    case 'mysql':
      return `mysql://${auth}@${db.host}:${db.port}/${db.name}${db.ssl ? '?sslaccept=strict' : ''}`;

    case 'sqlserver':
    case 'mssql':
      return `sqlserver://${db.host}:${db.port};database=${db.name};user=${db.username};password=${db.password};${db.ssl ? 'encrypt=true' : 'trustServerCertificate=true'}`;

    case 'sqlite':
      // Với SQLite, 'name' là đường dẫn file
      return `file:${db.name}`;

    default:
      throw new Error(
        `Unsupported database type: "${db.type}". ` +
        `Supported: postgresql, mysql, sqlserver, sqlite`,
      );
  }
}
