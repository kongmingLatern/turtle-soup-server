import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { User } from '../users/user.entity'
import { CreateSoupDto } from './dto'
import { SoupsService } from './soups.service'

@Controller('soups')
export class SoupsController {
  constructor(private readonly soupsService: SoupsService) {}

  @Get()
  list() {
    return this.soupsService.list()
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateSoupDto, @CurrentUser() user: User) {
    return this.soupsService.create(dto, user)
  }
}
