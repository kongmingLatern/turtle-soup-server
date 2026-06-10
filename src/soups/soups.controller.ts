import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { User } from '../users/user.entity'
import { CreateSoupDto, UpdateSoupDto } from './dto'
import { SoupsService } from './soups.service'

@Controller('soups')
export class SoupsController {
  constructor(private readonly soupsService: SoupsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: User) {
    return this.soupsService.list(user)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateSoupDto, @CurrentUser() user: User) {
    return this.soupsService.create(dto, user)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateSoupDto, @CurrentUser() user: User) {
    return this.soupsService.update(id, dto, user)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.soupsService.remove(id, user)
  }
}
