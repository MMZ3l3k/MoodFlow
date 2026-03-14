import { Controller, Get, Param, UseGuards, Request, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Get()
  findMine(@Request() req: any) {
    return this.resultsService.findMyResults(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.resultsService.findMyResultById(req.user.id, id);
    if (!result) throw new NotFoundException('Wynik nie znaleziony');
    return result;
  }
}
