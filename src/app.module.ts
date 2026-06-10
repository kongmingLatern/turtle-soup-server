import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { Question } from './rooms/question.entity'
import { Room } from './rooms/room.entity'
import { RoomsModule } from './rooms/rooms.module'
import { Soup } from './soups/soup.entity'
import { SoupsModule } from './soups/soups.module'
import { User } from './users/user.entity'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqljs',
        location: config.get('DATABASE_PATH', './data/turtle-soup.sqlite'),
        autoSave: true,
        entities: [User, Soup, Room, Question],
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    SoupsModule,
    RoomsModule,
  ],
})
export class AppModule {}
