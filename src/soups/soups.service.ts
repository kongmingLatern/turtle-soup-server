import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { builtinSoups } from './builtin-soups'
import { CreateSoupDto } from './dto'
import { Soup } from './soup.entity'

@Injectable()
export class SoupsService implements OnModuleInit {
  constructor(@InjectRepository(Soup) private readonly soups: Repository<Soup>) {}

  async onModuleInit() {
    const count = await this.soups.count({ where: { isBuiltin: true } })
    if (count > 0) return
    await this.soups.save(builtinSoups.map((soup) => this.soups.create({ ...soup, isBuiltin: true })))
  }

  list() {
    return this.soups.find({ order: { isBuiltin: 'DESC', createdAt: 'DESC' } })
  }

  findById(id: string) {
    return this.soups.findOne({ where: { id } })
  }

  create(dto: CreateSoupDto, creator: User) {
    return this.soups.save(
      this.soups.create({
        ...dto,
        category: dto.category ?? '自建',
        difficulty: dto.difficulty ?? 'medium',
        isBuiltin: false,
        creator,
      }),
    )
  }
}
