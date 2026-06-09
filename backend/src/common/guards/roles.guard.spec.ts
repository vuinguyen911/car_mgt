import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// ── Helper để tạo mock ExecutionContext ───────────────────────────────────────
function makeContext(userRole: string | null, handlerRoles?: UserRole[], classRoles?: UserRole[]) {
  return {
    getHandler: () => 'mockHandler',
    getClass:   () => 'mockClass',
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { role: userRole } : undefined,
      }),
    }),
  } as any;
}

function makeReflector(handlerRoles?: UserRole[], classRoles?: UserRole[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) return handlerRoles ?? classRoles ?? undefined;
    return undefined;
  });
  return reflector;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('RolesGuard', () => {
  it('cho phép truy cập khi route không yêu cầu role cụ thể', () => {
    const guard = new RolesGuard(makeReflector());       // không có required roles
    const ctx   = makeContext('VIEWER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('cho phép ADMIN truy cập route yêu cầu ADMIN', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]));
    const ctx   = makeContext('ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('chặn VIEWER truy cập route yêu cầu ADMIN', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]));
    const ctx   = makeContext('VIEWER');
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('cho phép khi user có một trong nhiều role được chấp nhận', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN, UserRole.SALES_MANAGER]));
    const ctx   = makeContext('SALES_MANAGER');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('chặn khi user là null/undefined', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]));
    const ctx   = makeContext(null);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('cho phép SUPER_ADMIN nếu nằm trong danh sách role cho phép', () => {
    const guard = new RolesGuard(makeReflector([UserRole.SUPER_ADMIN, UserRole.ADMIN]));
    const ctx   = makeContext('SUPER_ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('chặn SALES_STAFF truy cập route chỉ dành INVENTORY_MANAGER', () => {
    const guard = new RolesGuard(makeReflector([UserRole.INVENTORY_MANAGER]));
    const ctx   = makeContext('SALES_STAFF');
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
