import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.secret') as string,
      expiresIn: this.config.get<string>('jwt.expires_in') ?? '15m',
    } as any);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refresh_secret') as string,
      expiresIn: this.config.get<string>('jwt.refresh_expires_in') ?? '7d',
    } as any);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId, branchId: user.branchId },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token, { secret: this.config.get<string>('jwt.refresh_secret') });
      const accessToken = this.jwt.sign(
        { sub: payload.sub, email: payload.email },
        { secret: this.config.get<string>('jwt.secret') as string, expiresIn: this.config.get<string>('jwt.expires_in') ?? '15m' } as any,
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async listUsers(tenantId: string, search?: string) {
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    const data = await this.prisma.user.findMany({
      where,
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, isActive: true, lastLoginAt: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, tenantId: true, branchId: true, avatarUrl: true, lastLoginAt: true, createdAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
        branch: { select: { id: true, name: true, city: true } },
      },
    });
  }
}
