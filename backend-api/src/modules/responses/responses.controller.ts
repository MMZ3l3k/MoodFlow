import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { SubmitResponsesDto } from './dto/submit-responses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('responses')
@UseGuards(JwtAuthGuard)
export class ResponsesController {
  constructor(private responsesService: ResponsesService) {}

  @Post()
  submit(@Request() req: any, @Body() dto: SubmitResponsesDto) {
    return this.responsesService.submit(req.user, dto);
  }
}
