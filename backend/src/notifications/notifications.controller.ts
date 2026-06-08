import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query('unread') unread?: string) {
    return this.svc.findAll(u.id, unread === 'true');
  }

  @Get('unread-count')
  countUnread(@CurrentUser() u: any) {
    return this.svc.countUnread(u.id);
  }

  @Put(':id/read')
  markRead(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.markRead(u.id, id);
  }
}
