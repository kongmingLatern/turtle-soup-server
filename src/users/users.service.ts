import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findByUsername(username: string) {
    return this.users.findOne({ where: { username } })
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } })
  }

  create(input: Pick<User, 'username' | 'passwordHash' | 'displayName'>) {
    return this.users.save(this.users.create(input))
  }

  save(user: User) {
    return this.users.save(user)
  }

  addPoints(userId: string, points: number) {
    return this.users.increment({ id: userId }, 'points', points)
  }
}
