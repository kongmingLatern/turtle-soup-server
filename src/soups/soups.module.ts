import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Soup } from './soup.entity'
import { SoupsController } from './soups.controller'
import { SoupsService } from './soups.service'

@Module({
  imports: [TypeOrmModule.forFeature([Soup])],
  controllers: [SoupsController],
  providers: [SoupsService],
  exports: [SoupsService],
})
export class SoupsModule {}
