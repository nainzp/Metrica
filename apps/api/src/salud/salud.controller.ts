import { Controller, Get } from '@nestjs/common';
import { SaludService } from './salud.service';

@Controller('salud')
export class SaludController {
  constructor(private saludService: SaludService) {}

  @Get()
  async consultarSalud() {
    return this.saludService.verificarSalud();
  }
}
