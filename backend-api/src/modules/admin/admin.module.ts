import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AssessmentResult])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
