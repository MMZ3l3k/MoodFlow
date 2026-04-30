import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  const defaultUsers = [
    {
      email: 'owner@moodflow.pl',
      firstName: 'Właściciel',
      lastName: 'Platformy',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      password: 'SuperAdmin1!',
    },
  ];

  for (const u of defaultUsers) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (exists) continue;

    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = userRepo.create({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.status,
      passwordHash,
    });
    await userRepo.save(user);
    console.log(`Seed users: utworzono ${u.role} — ${u.email}`);
  }
}
