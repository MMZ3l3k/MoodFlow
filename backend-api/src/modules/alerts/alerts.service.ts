import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WellbeingAlert, AlertStatus, AlertType } from './entities/wellbeing-alert.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationStatus } from '../../common/enums/organization-status.enum';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

/** Co ile godzin cykliczna analiza przelicza alerty dla wszystkich aktywnych organizacji (PU-13, krok 1). */
const REFRESH_INTERVAL_HOURS = 6;

@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(WellbeingAlert) private readonly alertRepo: Repository<WellbeingAlert>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly analytics: AnalyticsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    // Cykliczna analiza: pierwsze przeliczenie krótko po starcie, potem co REFRESH_INTERVAL_HOURS.
    const run = () => this.refreshAllOrganizations().catch((e) => this.logger.error(e));
    setTimeout(run, 15_000);
    this.timer = setInterval(run, REFRESH_INTERVAL_HOURS * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refreshAllOrganizations(): Promise<void> {
    const orgs = await this.orgRepo.find({ where: { status: OrganizationStatus.ACTIVE } });
    for (const org of orgs) {
      try {
        await this.refreshForOrganization(org.id);
      } catch (e) {
        this.logger.error(`Alert refresh failed for org ${org.id}: ${e}`);
      }
    }
  }

  /**
   * Przelicza alerty organizacji na podstawie obciążenia działów (k-anonimowość
   * dziedziczona z analityki: działy poniżej progu mają wellbeingIndex = null
   * i nigdy nie generują alertu).
   */
  async refreshForOrganization(organizationId: number): Promise<void> {
    const deptLoad = await this.analytics.getDepartmentWellbeingLoad(organizationId);

    const wanted = new Map<string, { type: AlertType; row: any }>();
    for (const row of deptLoad) {
      if (row.anonymized || row.wellbeingIndex === null) continue;
      if (row.load === 'high') wanted.set(`${row.department}|${AlertType.HIGH_LOAD}`, { type: AlertType.HIGH_LOAD, row });
      if (row.trend === 'worsening') wanted.set(`${row.department}|${AlertType.WORSENING}`, { type: AlertType.WORSENING, row });
    }

    const open = await this.alertRepo.find({
      where: { organizationId, status: AlertStatus.ACTIVE },
    });
    const openByKey = new Map(open.map((a) => [`${a.department}|${a.type}`, a]));

    // 1) warunek ustąpił -> automatyczne zamknięcie aktywnego alertu
    for (const [key, alert] of openByKey) {
      if (!wanted.has(key)) {
        alert.status = AlertStatus.RESOLVED;
        await this.alertRepo.save(alert);
      }
    }

    // 2) nowe warunki -> nowy alert + powiadomienia RISK_ALERT dla HR i administratora
    for (const [key, { type, row }] of wanted) {
      const existing = openByKey.get(key);
      if (existing) {
        existing.wellbeingIndex = row.wellbeingIndex;
        existing.participants = row.participants;
        existing.deptSize = row.deptSize;
        await this.alertRepo.save(existing);
        continue;
      }
      const alert = await this.alertRepo.save(
        this.alertRepo.create({
          organizationId,
          department: row.department,
          type,
          wellbeingIndex: row.wellbeingIndex,
          previousIndex: null,
          participants: row.participants,
          deptSize: row.deptSize,
          status: AlertStatus.ACTIVE,
        }),
      );
      await this.notifyStaff(organizationId, alert);
    }
  }

  private async notifyStaff(organizationId: number, alert: WellbeingAlert): Promise<void> {
    const staff = await this.userRepo.find({
      where: [
        { organizationId, role: Role.HR, status: UserStatus.ACTIVE },
        { organizationId, role: Role.ADMIN, status: UserStatus.ACTIVE },
      ],
    });
    const label = alert.type === AlertType.HIGH_LOAD ? 'wysokie obciążenie' : 'pogorszenie trendu';
    await this.notifications.createMany(
      staff.map((u) => ({
        userId: u.id,
        type: NotificationType.RISK_ALERT,
        title: 'Nowy alert dobrostanu',
        message: `Dział „${alert.department}”: ${label} (indeks ${alert.wellbeingIndex ?? '—'}/100).`,
        link: '/dashboard/hr/alerts',
        metadata: { alertId: alert.id, department: alert.department, type: alert.type },
      })),
    );
  }

  async listForOrganization(organizationId: number, includeClosed = false) {
    await this.refreshForOrganization(organizationId);
    const where = includeClosed
      ? { organizationId }
      : { organizationId, status: AlertStatus.ACTIVE };
    return this.alertRepo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  async update(
    id: number,
    organizationId: number,
    actorUserId: number,
    changes: { status?: 'HANDLED'; note?: string },
  ) {
    const alert = await this.alertRepo.findOne({ where: { id, organizationId } });
    if (!alert) throw new NotFoundException('Alert nie istnieje');

    if (typeof changes.note === 'string') {
      alert.note = changes.note.trim() || null;
    }
    if (changes.status === 'HANDLED' && alert.status !== AlertStatus.HANDLED) {
      alert.status = AlertStatus.HANDLED;
      alert.handledByUserId = actorUserId;
      alert.handledAt = new Date();
      await this.audit.log({
        action: AuditAction.ALERT_HANDLED,
        actorUserId,
        organizationId,
        entityType: 'wellbeing_alert',
        entityId: alert.id,
        metadata: { department: alert.department, type: alert.type, note: alert.note },
      });
    }
    return this.alertRepo.save(alert);
  }
}
