import {
  Controller, Post, Get, Param, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
@Controller('import')
export class ImportController {
  constructor(private svc: ImportService) {}

  /**
   * POST /import/vehicles/csv
   * Upload file CSV, trả về importId ngay lập tức.
   * Tiến trình được gửi qua WebSocket event: import:progress, import:done
   *
   * CSV columns: vin, brand, model, year, trim, condition, odometer,
   *              costPrice, sellingPrice, minPrice, plateNumber, location, importDate
   */
  @Post('vehicles/csv')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (_, file, cb) => {
      if (!file.originalname.match(/\.(csv|txt)$/i)) {
        return cb(new BadRequestException('Chỉ chấp nhận file CSV'), false);
      }
      cb(null, true);
    },
  }))
  async uploadCsv(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file CSV');
    return this.svc.queueCsvImport(
      user.tenantId,
      user.branchId,
      user.id,
      file.buffer,
    );
  }

  /** GET /import/jobs/:jobId — kiểm tra trạng thái job */
  @Get('jobs/:jobId')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.svc.getJobStatus(jobId);
  }

  /** GET /import/queue/stats — thống kê queue */
  @Get('queue/stats')
  getQueueStats() {
    return this.svc.getQueueStats();
  }

  /** GET /import/template — tải file CSV mẫu */
  @Get('template')
  getTemplate() {
    return {
      headers: [
        'vin', 'brand', 'model', 'year', 'trim', 'condition',
        'odometer', 'costPrice', 'sellingPrice', 'minPrice',
        'plateNumber', 'location', 'importDate', 'engineType',
        'transmission', 'driveType', 'seats', 'doors',
      ],
      example: {
        vin: 'JTDBE3EH4B0000001',
        brand: 'Toyota',
        model: 'Camry',
        year: 2024,
        trim: '2.5Q',
        condition: 'NEW',
        odometer: 0,
        costPrice: 1050000000,
        sellingPrice: 1235000000,
        minPrice: 1150000000,
        plateNumber: '',
        location: 'A-01-01',
        importDate: '2024-01-15',
        engineType: 'hybrid',
        transmission: 'auto',
        driveType: 'fwd',
        seats: 5,
        doors: 4,
      },
      downloadUrl: '/api/v1/import/template/csv',
    };
  }
}
