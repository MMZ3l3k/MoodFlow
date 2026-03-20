import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async createByAdmin(dto: CreateUserAdminDto): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const data: Partial<User> = {
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      department: dto.department ?? null,
      role: dto.role ?? Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    };
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async getDepartments(): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .where('user.department IS NOT NULL')
      .distinct(true)
      .getRawMany<{ department: string }>();
    return rows.map((r) => r.department).sort();
  }

  async renameDepartment(oldName: string, newName: string): Promise<{ updated: number }> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({ department: newName })
      .where('department = :oldName', { oldName })
      .execute();
    return { updated: result.affected ?? 0 };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id }, relations: ['organization'] });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['organization'] });
  }

  async findPending(): Promise<User[]> {
    return this.usersRepository.find({
      where: { status: UserStatus.PENDING },
      relations: ['organization'],
    });
  }

  async updateStatus(id: number, dto: ApproveUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    user.status = dto.status;
    return this.usersRepository.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Użytkownik nie znaleziony');
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
    await this.usersRepository.save(user);
  }

  async deleteAccount(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  getProfile(user: User) {
    const { passwordHash, ...profile } = user;
    return profile;
  }
}
