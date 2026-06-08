/**
 * Injection tokens cho mỗi repository.
 * Service inject qua token này — không phụ thuộc vào implementation cụ thể.
 *
 * Để swap sang MySQL: tạo VehicleMysqlRepository implements IVehicleRepository,
 * đổi provider trong VehiclesModule từ VehiclePrismaRepository sang class mới.
 * Service/Controller không cần thay đổi.
 */
export const VEHICLE_REPOSITORY = 'VEHICLE_REPOSITORY';
export const BRAND_REPOSITORY = 'BRAND_REPOSITORY';
export const CUSTOMER_REPOSITORY = 'CUSTOMER_REPOSITORY';
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';
export const REPORT_REPOSITORY = 'REPORT_REPOSITORY';
export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';
