import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../modules/users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  const defaultUsers = [
    {
      email: 'admin@moodflow.pl',
      firstName: 'Adam',
      lastName: 'Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      password: 'Admin123!',
    },
    {
      email: 'hr@moodflow.pl',
      firstName: 'Hanna',
      lastName: 'HR',
      role: Role.HR,
      status: UserStatus.ACTIVE,
      password: 'Hr123456!',
    },
    {
      email: 'pracownik@moodflow.pl',
      firstName: 'Piotr',
      lastName: 'Kowalski',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      password: 'Pracownik1!',
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
