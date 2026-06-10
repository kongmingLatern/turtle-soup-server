import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SoupsModule } from '../soups/soups.module'
import { UsersModule } from '../users/users.module'
import { Question } from './question.entity'
import { Room } from './room.entity'
import { RoomsController } from './rooms.controller'
import { RoomsGateway } from './rooms.gateway'
import { RoomsService } from './rooms.service'

@Module({
  imports: [TypeOrmModule.forFeature([Room, Question]), SoupsModule, UsersModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway],
})
export class RoomsModule {}
