import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { MailService } from './mail.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [MailService, NotificationsService],
  controllers: [NotificationsController],
  exports: [MailService, NotificationsService],
})
export class NotificationsModule {}
