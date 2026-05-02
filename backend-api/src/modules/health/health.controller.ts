import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const dbOk = await this.dataSource
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);

    const status = dbOk ? 'ok' : 'degraded';
    return {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database: dbOk ? 'ok' : 'fail' },
    };
  }
}
