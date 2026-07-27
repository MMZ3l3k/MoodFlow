import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(name: string, organizationId: number): Promise<Department> {
    const dept = this.departmentsRepository.create({ name, organizationId });
    return this.departmentsRepository.save(dept);
  }

  async findByOrganization(organizationId: number): Promise<Department[]> {
    return this.departmentsRepository.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Department> {
    const dept = await this.departmentsRepository.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Dział nie znaleziony');
    return dept;
  }

  async update(id: number, name: string, organizationId: number): Promise<Department> {
    const dept = await this.findById(id);
    if (dept.organizationId !== organizationId) {
      throw new ForbiddenException('Brak dostępu do tego działu');
    }
    dept.name = name;
    return this.departmentsRepository.save(dept);
  }

  async remove(id: number, organizationId: number): Promise<void> {
    const dept = await this.findById(id);
    if (dept.organizationId !== organizationId) {
      throw new ForbiddenException('Brak dostępu do tego działu');
    }
    // PU-18, ścieżka 3b: nie można usunąć działu z przypisanymi pracownikami —
    // najpierw trzeba ich przenieść (ochrona przed „osieroceniem" kont).
    // Sprawdzane są oba modele przypisania: relacja departmentId oraz nazwa działu
    // w polu tekstowym używanym przez analitykę i przypisania testów.
    const assignedUsers = await this.usersRepository
      .createQueryBuilder('u')
      .where('u."organizationId" = :organizationId', { organizationId })
      .andWhere('(u."departmentId" = :id OR u.department = :name)', { id, name: dept.name })
      .getCount();
    if (assignedUsers > 0) {
      throw new ConflictException(
        `Nie można usunąć działu — przypisanych jest do niego ${assignedUsers} pracowników. Najpierw przenieś ich do innego działu.`,
      );
    }
    await this.departmentsRepository.delete(id);
  }
}
