import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from './current-user.decorator'
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { AuthService } from './auth.service'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarDataUrl: user.avatarDataUrl,
      points: user.points,
      rankTitle: user.rankTitle,
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    user.avatarDataUrl = dto.avatarDataUrl
    const saved = await this.usersService.save(user)
    return {
      id: saved.id,
      username: saved.username,
      displayName: saved.displayName,
      avatarDataUrl: saved.avatarDataUrl,
      points: saved.points,
      rankTitle: saved.rankTitle,
    }
  }
}
