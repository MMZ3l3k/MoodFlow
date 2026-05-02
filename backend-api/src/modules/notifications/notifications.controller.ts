import {
  Controller, Get, Post, Delete, Param, Req, UseGuards,
  ParseIntPipe, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() req: any, @Query('limit') limit?: string) {
    const parsed = Math.min(Number(limit) || 50, 100);
    return this.notifications.listForUser(req.user.id, parsed);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.notifications.unreadCount(req.user.id);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notifications.markRead(id, req.user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Req() req: any) {
    const updated = await this.notifications.markAllRead(req.user.id);
    return { updated };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notifications.deleteOne(id, req.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAll(@Req() req: any) {
    return this.notifications.deleteAll(req.user.id);
  }
}
