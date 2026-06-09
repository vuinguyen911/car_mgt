import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { PrismaService } from '../common/database/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { IMPORT_QUEUE } from './import.constants';

export interface ImportJobData {
  tenantId: string;
  branchId: string;
  userId: string;
  csvBuffer: number[]; // Buffer serialized as number array
  importId: string;
}

@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>) {
    const { tenantId, branchId, userId, csvBuffer, importId } = job.data;
    const buffer = Buffer.from(csvBuffer);

    this.logger.log(`Processing import job ${importId}`);

    // Emit started
    this.gateway.emitToUser(userId, 'import:started', { importId });

    const rows: any[] = await this.parseCsv(buffer);
    const total = rows.length;
    let success = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    // Lấy default brand/model/variant từ DB hoặc tạo mới
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.processRow(row, tenantId, branchId);
        success++;
      } catch (err: any) {
        failed++;
        errors.push({ row: i + 2, error: err.message });
      }

      // Emit progress mỗi 10 rows hoặc lần cuối
      if ((i + 1) % 10 === 0 || i === rows.length - 1) {
        const progress = Math.round(((i + 1) / total) * 100);
        await job.updateProgress(progress);
        this.gateway.emitToUser(userId, 'import:progress', {
          importId,
          progress,
          processed: i + 1,
          total,
          success,
          failed,
        });
      }
    }

    // Cập nhật import record
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'IMPORT_VEHICLES',
        entity: 'Vehicle',
        entityId: importId,
        newData: { total, success, failed, errors: errors.slice(0, 50) } as any,
      },
    });

    // Emit done
    this.gateway.emitToUser(userId, 'import:done', {
      importId,
      total,
      success,
      failed,
      errors: errors.slice(0, 20),
    });

    this.logger.log(`Import ${importId} done: ${success}/${total} success`);
    return { total, success, failed };
  }

  private parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  private async processRow(row: any, tenantId: string, branchId: string) {
    // Tìm hoặc tạo Brand
    const brandName = (row.brand || row.Brand || '').trim();
    const modelName = (row.model || row.Model || '').trim();
    const variantYear = parseInt(row.year || row.Year || new Date().getFullYear());
    const trimLevel = (row.trim || row.Trim || row.trimLevel || 'Base').trim();
    const vin = (row.vin || row.VIN || '').trim();

    if (!vin) throw new Error('VIN is required');
    if (!brandName) throw new Error('Brand is required');
    if (!modelName) throw new Error('Model is required');

    // Upsert brand
    let brand = await this.prisma.brand.findFirst({ where: { tenantId, name: brandName } });
    if (!brand) {
      brand = await this.prisma.brand.create({
        data: { tenantId, name: brandName, country: row.country || 'Unknown' },
      });
    }

    // Upsert model
    let model = await this.prisma.model.findFirst({ where: { brandId: brand.id, name: modelName } });
    if (!model) {
      model = await this.prisma.model.create({
        data: { brandId: brand.id, name: modelName, segment: row.segment || 'sedan' },
      });
    }

    // Upsert variant
    let variant = await this.prisma.variant.findFirst({
      where: { modelId: model.id, year: variantYear, trimLevel },
    });
    if (!variant) {
      variant = await this.prisma.variant.create({
        data: {
          modelId: model.id,
          year: variantYear,
          trimLevel,
          engineType: row.engineType || 'gasoline',
          transmission: row.transmission || 'auto',
          driveType: row.driveType || 'fwd',
          seats: parseInt(row.seats || '5'),
          doors: parseInt(row.doors || '4'),
          currency: 'VND',
        },
      });
    }

    // Upsert vehicle
    const existing = await this.prisma.vehicle.findUnique({ where: { vin } });
    if (existing) {
      // Update nếu đã tồn tại
      await this.prisma.vehicle.update({
        where: { vin },
        data: {
          sellingPrice: row.sellingPrice ? parseFloat(row.sellingPrice) : undefined,
          costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
          odometerKm: row.odometer ? parseInt(row.odometer) : 0,
        },
      });
    } else {
      await this.prisma.vehicle.create({
        data: {
          tenantId,
          branchId,
          variantId: variant.id,
          vin,
          plateNumber: row.plateNumber || row.plate || null,
          condition: (row.condition || 'NEW').toUpperCase(),
          status: 'AVAILABLE',
          odometerKm: parseInt(row.odometer || '0'),
          costPrice: row.costPrice ? parseFloat(row.costPrice) : null,
          sellingPrice: row.sellingPrice ? parseFloat(row.sellingPrice) : null,
          minPrice: row.minPrice ? parseFloat(row.minPrice) : null,
          lotLocation: row.location || row.lotLocation || null,
          importDate: row.importDate ? new Date(row.importDate) : new Date(),
          statusLogs: { create: { toStatus: 'AVAILABLE', note: 'CSV Import' } },
        },
      });
    }
  }
}
