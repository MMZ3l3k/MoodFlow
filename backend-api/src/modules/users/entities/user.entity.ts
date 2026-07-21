import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // K2: nigdy nie serializuj hasha do odpowiedzi API (ClassSerializerInterceptor
  // usuwa to pole ze wszystkich zwracanych encji User). Odczyt wewnętrzny (bcrypt.compare) działa normalnie.
  @Exclude()
  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // Zachowane dla backward compat
  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  // FK do encji Department
  @Column({ nullable: true, type: 'int' })
  departmentId: number | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  departmentEntity: Department | null;

  @Column({ nullable: true, type: 'int' })
  organizationId: number;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // H10: wersja tokenów użytkownika. Podbicie licznika unieważnia natychmiast
  // wszystkie wcześniej wydane tokeny (access i refresh) — strategie JWT
  // porównują wartość z payloadu z wartością w bazie.
  @Column({ default: 0 })
  tokenVersion: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
