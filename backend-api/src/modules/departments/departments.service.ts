import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
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
    await this.departmentsRepository.delete(id);
  }
}
