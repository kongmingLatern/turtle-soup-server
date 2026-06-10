import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { LoginDto, RegisterDto } from './dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByUsername(dto.username)
    if (exists) throw new ConflictException('用户名已存在')
    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({
      username: dto.username,
      passwordHash,
      displayName: dto.displayName,
    })
    return this.sign(user)
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username)
    if (!user) throw new UnauthorizedException('用户名或密码错误')
    const ok = await bcrypt.compare(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('用户名或密码错误')
    return this.sign(user)
  }

  sign(user: {
    id: string
    username: string
    displayName: string
    avatarDataUrl?: string
    points?: number
    rankTitle?: string
  }) {
    return {
      token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
      }),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarDataUrl: user.avatarDataUrl ?? '',
        points: user.points ?? 0,
        rankTitle: user.rankTitle ?? '路人甲',
      },
    }
  }
}
