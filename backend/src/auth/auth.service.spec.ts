import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/database/prisma.service';

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'user-1',
  email: 'admin@demo.com',
  fullName: 'Admin User',
  role: 'ADMIN',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  isActive: true,
  passwordHash: '',
  lastLoginAt: null,
};

function makePrisma(overrides: Partial<typeof mockUser> = {}) {
  const user = { ...mockUser, ...overrides };
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
      findMany: jest.fn().mockResolvedValue([user]),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  };
}

// ── Test Suite ─────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = makePrisma();
    jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };
    configService = { get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.refresh_secret': 'test-refresh-secret',
        'jwt.expires_in': '15m',
        'jwt.refresh_expires_in': '7d',
      };
      return map[key];
    }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('trả về accessToken + refreshToken khi credentials đúng', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: 'admin@demo.com', password: 'password123' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.email).toBe('admin@demo.com');
      expect(result.user.role).toBe('ADMIN');
      // Không trả về passwordHash
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('ném UnauthorizedException khi user không tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@demo.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ném UnauthorizedException khi password sai', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
      await expect(
        service.login({ email: 'admin@demo.com', password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ném UnauthorizedException khi user bị vô hiệu hoá', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false, passwordHash: hash });
      await expect(
        service.login({ email: 'admin@demo.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('cập nhật lastLoginAt sau khi đăng nhập thành công', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
      await service.login({ email: 'admin@demo.com', password: 'password123' });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastLoginAt: expect.any(Date) }) }),
      );
    });

    it('ký JWT với đúng payload', async () => {
      const hash = await bcrypt.hash('password123', 10);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
      await service.login({ email: 'admin@demo.com', password: 'password123' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'admin@demo.com' },
        expect.objectContaining({ secret: 'test-secret' }),
      );
    });
  });

  // ── refreshToken ───────────────────────────────────────────────────────────
  describe('refreshToken()', () => {
    it('trả về accessToken mới khi refresh token hợp lệ', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'admin@demo.com' });
      const result = await service.refreshToken('valid-refresh-token');
      expect(result.accessToken).toBe('signed-token');
    });

    it('ném UnauthorizedException khi refresh token không hợp lệ', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── listUsers ──────────────────────────────────────────────────────────────
  describe('listUsers()', () => {
    it('trả về danh sách user theo tenantId', async () => {
      const result = await service.listUsers('tenant-1');
      expect(result.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }),
      );
    });

    it('thêm điều kiện tìm kiếm khi có search param', async () => {
      await service.listUsers('tenant-1', 'admin');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });
});
