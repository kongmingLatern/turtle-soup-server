import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { CreateSoupDto, UpdateSoupDto } from './dto'
import { Soup } from './soup.entity'

@Injectable()
export class SoupsService {
  constructor(@InjectRepository(Soup) private readonly soups: Repository<Soup>) {}

  list(user: User) {
    return this.soups.find({
      where: { isBuiltin: false, creator: { id: user.id } },
      relations: { creator: true },
      order: { createdAt: 'DESC' },
    })
  }

  findById(id: string) {
    return this.soups.findOne({ where: { id }, relations: { creator: true } })
  }

  async findOwnedById(id: string, user: User) {
    const soup = await this.findById(id)
    if (!soup || soup.isBuiltin || soup.creator?.id !== user.id) {
      throw new ForbiddenException('只能使用自己创建的汤面')
    }
    return soup
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

  async update(id: string, dto: UpdateSoupDto, user: User) {
    const soup = await this.findOwnedById(id, user)
    Object.assign(soup, dto)
    return this.soups.save(soup)
  }

  async remove(id: string, user: User) {
    const soup = await this.findOwnedById(id, user)
    await this.soups.delete({ id: soup.id })
    return { deleted: true }
  }
}
