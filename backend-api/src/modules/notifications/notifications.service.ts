import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType | string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notif = this.repo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ?? null,
      read: false,
    });
    return this.repo.save(notif);
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    const entities = inputs.map((i) =>
      this.repo.create({
        userId: i.userId,
        type: i.type,
        title: i.title,
        message: i.message,
        link: i.link ?? null,
        metadata: i.metadata ?? null,
        read: false,
      }),
    );
    await this.repo.save(entities);
  }

  async listForUser(userId: number, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async unreadCount(userId: number): Promise<number> {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(id: number, userId: number): Promise<void> {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException('Powiadomienie nie znalezione');
    if (notif.userId !== userId) throw new ForbiddenException('Brak dostępu');
    if (!notif.read) {
      notif.read = true;
      notif.readAt = new Date();
      await this.repo.save(notif);
    }
  }

  async markAllRead(userId: number): Promise<number> {
    const result = await this.repo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async deleteOne(id: number, userId: number): Promise<void> {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException('Powiadomienie nie znalezione');
    if (notif.userId !== userId) throw new ForbiddenException('Brak dostępu');
    await this.repo.delete(id);
  }

  async deleteAll(userId: number): Promise<void> {
    await this.repo.delete({ userId });
  }
}
