import { Injectable, NotFoundException, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditService: AuditService,
    private notifications: NotificationsService,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  // Admin firmy tworzy użytkownika w swojej organizacji
  async createByAdmin(dto: CreateUserAdminDto, organizationId: number): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    // K1: admin firmy może tworzyć tylko konta EMPLOYEE/HR/ADMIN — nigdy SUPER_ADMIN
    if (dto.role && ![Role.EMPLOYEE, Role.HR, Role.ADMIN].includes(dto.role)) {
      throw new ForbiddenException('Nie można utworzyć konta z tą rolą');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const data: Partial<User> = {
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      department: dto.department ?? null,
      role: dto.role ?? Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      organizationId,
    };
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  // Zwraca działy tylko z danej organizacji (string department — backward compat)
  async getDepartments(organizationId: number): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .where('user.department IS NOT NULL')
      .andWhere('user.organizationId = :organizationId', { organizationId })
      .distinct(true)
      .getRawMany<{ department: string }>();
    return rows.map((r) => r.department).sort();
  }

  async renameDepartment(oldName: string, newName: string, organizationId: number): Promise<{ updated: number }> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ department: newName })
      .where('department = :oldName AND organizationId = :organizationId', { oldName, organizationId })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['organization'] });
  }

  // ADMIN widzi tylko swoją org, SUPER_ADMIN widzi wszystkich
  async findAll(callerOrganizationId?: number): Promise<User[]> {
    if (callerOrganizationId) {
      return this.usersRepository.find({
        where: { organizationId: callerOrganizationId },
        relations: ['organization'],
      });
    }
    return this.usersRepository.find({ relations: ['organization'] });
  }

  // ADMIN widzi tylko oczekujących ze swojej org
  async findPending(callerOrganizationId?: number): Promise<User[]> {
    if (callerOrganizationId) {
      return this.usersRepository.find({
        where: { status: UserStatus.PENDING, organizationId: callerOrganizationId },
        relations: ['organization'],
      });
    }
    return this.usersRepository.find({
      where: { status: UserStatus.PENDING },
      relations: ['organization'],
    });
  }

  // ADMIN może zmieniać status tylko użytkownika ze swojej org
  async updateStatus(id: number, dto: ApproveUserDto, callerOrganizationId?: number, actorUserId?: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    if (callerOrganizationId && user.organizationId !== callerOrganizationId) {
      throw new ForbiddenException('Brak dostępu do tego użytkownika');
    }
    const previousStatus = user.status;
    user.status = dto.status;
    // H10: zawieszenie/odrzucenie unieważnia natychmiast wszystkie wydane tokeny
    if (dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.REJECTED) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
    const saved = await this.usersRepository.save(user);

    const actionMap: Record<string, AuditAction> = {
      [UserStatus.ACTIVE]: previousStatus === UserStatus.SUSPENDED ? AuditAction.USER_REACTIVATED : AuditAction.USER_APPROVED,
      [UserStatus.REJECTED]: AuditAction.USER_REJECTED,
      [UserStatus.SUSPENDED]: AuditAction.USER_SUSPENDED,
    };
    const auditAction = actionMap[dto.status] ?? AuditAction.USER_APPROVED;

    await this.auditService.log({
      action: auditAction,
      actorUserId: actorUserId ?? null,
      organizationId: user.organizationId ?? null,
      entityType: 'user',
      entityId: user.id,
      metadata: { previousStatus, newStatus: dto.status, email: user.email },
    });

    // In-app notification do użytkownika którego status zmieniono
    if (auditAction === AuditAction.USER_APPROVED) {
      await this.notifications.create({
        userId: user.id,
        type: NotificationType.USER_APPROVED,
        title: 'Twoje konto zostało aktywowane',
        message: 'Możesz teraz w pełni korzystać z platformy MoodFlow.',
        link: '/app/home',
      });
    } else if (auditAction === AuditAction.USER_REJECTED) {
      await this.notifications.create({
        userId: user.id,
        type: NotificationType.USER_REJECTED,
        title: 'Twoje konto zostało odrzucone',
        message: 'Skontaktuj się z administratorem firmy w celu wyjaśnienia.',
      });
    }

    return saved;
  }

  async update(id: number, dto: UpdateUserDto, callerOrganizationId?: number, actorUserId?: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    if (callerOrganizationId && user.organizationId !== callerOrganizationId) {
      throw new ForbiddenException('Brak dostępu do tego użytkownika');
    }
    // K1: admin firmy (callerOrganizationId ustawione) nie może eskalować konta do SUPER_ADMIN.
    // Tylko SUPER_ADMIN (callerOrganizationId === undefined) ma pełną swobodę.
    if (dto.role === Role.SUPER_ADMIN && callerOrganizationId !== undefined) {
      throw new ForbiddenException('Nie masz uprawnień do nadania roli SUPER_ADMIN');
    }
    const previousRole = user.role;
    Object.assign(user, dto);
    const saved = await this.usersRepository.save(user);

    // M10: każda zmiana roli zostawia ślad w audit logu (wykrywanie nadużyć uprawnień)
    if (dto.role !== undefined && dto.role !== previousRole) {
      await this.auditService.log({
        action: AuditAction.USER_ROLE_CHANGED,
        actorUserId: actorUserId ?? null,
        organizationId: user.organizationId ?? null,
        entityType: 'user',
        entityId: user.id,
        metadata: { previousRole, newRole: dto.role, email: user.email },
      });
    }
    return saved;
  }

  async updateProfile(id: number, dto: UpdateProfileDto, callerOrganizationId?: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    if (callerOrganizationId && user.organizationId !== callerOrganizationId) {
      throw new ForbiddenException('Brak dostępu do tego użytkownika');
    }
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async setOnline(id: number, isOnline: boolean): Promise<void> {
    await this.usersRepository.update(id, {
      isOnline,
      lastSeenAt: new Date(),
    });
  }

  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new UnauthorizedException('Aktualne hasło jest nieprawidłowe');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    // H10: zmiana hasła unieważnia wszystkie dotychczasowe sesje użytkownika
    // (w tym ewentualną sesję atakującego znającego stare hasło).
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.usersRepository.save(user);
    await this.auditService.log({
      action: AuditAction.PASSWORD_CHANGED,
      actorUserId: user.id,
      organizationId: user.organizationId ?? null,
      entityType: 'user',
      entityId: user.id,
    });
  }

  async deleteAccount(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    await this.usersRepository.delete(id);
    if (user) {
      await this.auditService.log({
        action: AuditAction.ACCOUNT_DELETED,
        actorUserId: id,
        organizationId: user.organizationId ?? null,
        entityType: 'user',
        entityId: id,
        metadata: { email: user.email, role: user.role },
      });
    }
  }

  getProfile(user: User) {
    const { passwordHash, ...profile } = user;
    return profile;
  }
}
