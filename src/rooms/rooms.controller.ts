import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { User } from '../users/user.entity'
import {
  CreateQuestionDto,
  CreateRoomDto,
  RateSoupDto,
  SwitchSoupDto,
  TransferHostDto,
  UpdateQuestionDto,
  UpdateRoomDto,
} from './dto'
import { RoomsService } from './rooms.service'

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: User) {
    return this.roomsService.create(dto, user)
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.roomsService.findByCode(code)
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard)
  update(@Param('code') code: string, @Body() dto: UpdateRoomDto, @CurrentUser() user: User) {
    return this.roomsService.update(code, dto, user)
  }

  @Post(':code/switch-soup')
  @UseGuards(JwtAuthGuard)
  switchSoup(@Param('code') code: string, @Body() dto: SwitchSoupDto, @CurrentUser() user: User) {
    return this.roomsService.switchSoup(code, dto, user)
  }

  @Post(':code/transfer-host')
  @UseGuards(JwtAuthGuard)
  transferHost(
    @Param('code') code: string,
    @Body() dto: TransferHostDto,
    @CurrentUser() user: User,
  ) {
    return this.roomsService.transferHost(code, dto, user)
  }

  @Post(':code/questions')
  @UseGuards(JwtAuthGuard)
  addQuestion(
    @Param('code') code: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.roomsService.addQuestion(code, dto, user)
  }

  @Patch(':code/questions/:questionId')
  @UseGuards(JwtAuthGuard)
  updateQuestion(
    @Param('code') code: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: User,
  ) {
    return this.roomsService.updateQuestion(code, questionId, dto, user)
  }

  @Delete(':code/questions/:questionId')
  @UseGuards(JwtAuthGuard)
  removeQuestion(
    @Param('code') code: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: User,
  ) {
    return this.roomsService.removeQuestion(code, questionId, user)
  }

  @Post(':code/reveal')
  @UseGuards(JwtAuthGuard)
  reveal(@Param('code') code: string, @CurrentUser() user: User) {
    return this.roomsService.reveal(code, user)
  }

  @Post(':code/rating')
  @UseGuards(JwtAuthGuard)
  rateSoup(@Param('code') code: string, @Body() dto: RateSoupDto, @CurrentUser() user: User) {
    return this.roomsService.rateSoup(code, dto, user)
  }
}
