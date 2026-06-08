import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  async buildInventoryExcel(vehicles: any[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Car Admin System';
    const ws = wb.addWorksheet('Tồn kho xe', { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = [
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'Hãng xe', key: 'brand', width: 14 },
      { header: 'Dòng xe', key: 'model', width: 14 },
      { header: 'Năm', key: 'year', width: 7 },
      { header: 'Phiên bản', key: 'trim', width: 16 },
      { header: 'Màu ngoại thất', key: 'color', width: 16 },
      { header: 'Biển số', key: 'plate', width: 12 },
      { header: 'Tình trạng', key: 'condition', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Odometer (km)', key: 'odometer', width: 14 },
      { header: 'Giá bán (VNĐ)', key: 'sellingPrice', width: 18 },
      { header: 'Vị trí kho', key: 'location', width: 12 },
      { header: 'Chi nhánh', key: 'branch', width: 18 },
      { header: 'Ngày nhập', key: 'importDate', width: 12 },
    ];

    // Style header
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF2E75B6' } } };
    });

    vehicles.forEach((v, idx) => {
      const row = ws.addRow({
        vin: v.vin,
        brand: v.variant?.model?.brand?.name ?? '',
        model: v.variant?.model?.name ?? '',
        year: v.variant?.year ?? '',
        trim: v.variant?.trimLevel ?? '',
        color: v.exteriorColor?.name ?? '',
        plate: v.plateNumber ?? '',
        condition: v.condition,
        status: v.status,
        odometer: v.odometerKm,
        sellingPrice: v.sellingPrice ? Number(v.sellingPrice) : '',
        location: v.lotLocation ?? '',
        branch: v.branch?.name ?? '',
        importDate: v.importDate ? new Date(v.importDate).toLocaleDateString('vi-VN') : '',
      });

      // Zebra striping
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FF' } };
        });
      }

      // Format số tiền
      const priceCell = row.getCell('sellingPrice');
      if (typeof priceCell.value === 'number') {
        priceCell.numFmt = '#,##0';
        priceCell.alignment = { horizontal: 'right' };
      }
    });

    ws.autoFilter = { from: 'A1', to: 'N1' };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async buildSalesExcel(orders: any[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Car Admin System';
    const ws = wb.addWorksheet('Báo cáo doanh số', { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = [
      { header: 'Số đơn', key: 'orderNumber', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 14 },
      { header: 'Khách hàng', key: 'customer', width: 22 },
      { header: 'SĐT', key: 'phone', width: 14 },
      { header: 'Xe', key: 'car', width: 24 },
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'Nhân viên', key: 'salesperson', width: 18 },
      { header: 'Giá niêm yết (VNĐ)', key: 'listPrice', width: 20 },
      { header: 'Chiết khấu (VNĐ)', key: 'discount', width: 18 },
      { header: 'Giá bán (VNĐ)', key: 'finalPrice', width: 18 },
      { header: 'Đặt cọc (VNĐ)', key: 'deposit', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Thanh toán', key: 'paymentMethod', width: 14 },
      { header: 'Chi nhánh', key: 'branch', width: 18 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let totalRevenue = 0;
    orders.forEach((o, idx) => {
      const brand = o.vehicle?.variant?.model?.brand?.name ?? '';
      const model = o.vehicle?.variant?.model?.name ?? '';
      const year = o.vehicle?.variant?.year ?? '';
      const final = Number(o.finalPrice);
      totalRevenue += final;

      const row = ws.addRow({
        orderNumber: o.orderNumber,
        createdAt: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        customer: o.customer?.fullName ?? '',
        phone: o.customer?.phone ?? '',
        car: `${brand} ${model} ${year}`.trim(),
        vin: o.vehicle?.vin ?? '',
        salesperson: o.salesperson?.fullName ?? '',
        listPrice: Number(o.listPrice),
        discount: Number(o.discountAmount),
        finalPrice: final,
        deposit: Number(o.depositAmount),
        status: o.status,
        paymentMethod: o.paymentMethod ?? '',
        branch: o.branch?.name ?? '',
      });

      if (idx % 2 === 0) {
        row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9FF' } }; });
      }

      ['listPrice', 'discount', 'finalPrice', 'deposit'].forEach((k) => {
        const cell = row.getCell(k);
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      });
    });

    // Dòng tổng cộng
    const totalRow = ws.addRow({ orderNumber: 'TỔNG CỘNG', finalPrice: totalRevenue });
    totalRow.eachCell((c) => {
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
    });
    totalRow.getCell('finalPrice').numFmt = '#,##0';
    totalRow.getCell('finalPrice').alignment = { horizontal: 'right' };

    ws.autoFilter = { from: 'A1', to: 'N1' };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
