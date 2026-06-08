/**
 * Interface repository cơ bản.
 * Mọi repository đều implement interface này.
 * Khi swap DB (MySQL, Oracle...) chỉ cần viết lại implementation,
 * không cần đụng vào service/controller.
 */
export interface IBaseRepository<T, CreateDto, UpdateDto, QueryDto> {
  findAll(tenantId: string, query: QueryDto): Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }>;
  findById(tenantId: string, id: string): Promise<T | null>;
  create(tenantId: string, userId: string, dto: CreateDto): Promise<T>;
  update(tenantId: string, id: string, userId: string, dto: UpdateDto): Promise<T>;
  delete(tenantId: string, id: string): Promise<void>;
}
