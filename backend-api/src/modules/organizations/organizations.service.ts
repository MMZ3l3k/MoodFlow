import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const org = this.organizationsRepository.create(dto);
    return this.organizationsRepository.save(org);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find();
  }

  async findById(id: number): Promise<Organization> {
    const org = await this.organizationsRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organizacja nie znaleziona');
    return org;
  }
}
