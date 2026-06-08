import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { QuestionQuality, TruthGuess } from '../common/enums'
import { SoupsService } from '../soups/soups.service'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import { CreateQuestionDto, CreateRoomDto, UpdateQuestionDto, UpdateRoomDto } from './dto'
import { Question } from './question.entity'
import { Room } from './room.entity'
import { RoomsGateway } from './rooms.gateway'

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    private readonly soupsService: SoupsService,
    private readonly usersService: UsersService,
    private readonly gateway: RoomsGateway,
  ) {}

  async create(dto: CreateRoomDto, host: User) {
    const source = dto.soupId ? await this.soupsService.findById(dto.soupId) : null
    if (dto.soupId && !source) throw new NotFoundException('汤面不存在')

    const room = await this.rooms.save(
      this.rooms.create({
        code: await this.generateRoomCode(),
        title: dto.title ?? source?.title ?? '新海龟汤局',
        surface: dto.surface ?? source?.surface ?? '主持人正在编辑汤面。',
        answer: dto.answer ?? source?.answer ?? '主持人正在编辑汤底。',
        host,
        questions: [],
      }),
    )
    return this.findByCode(room.code)
  }

  async findByCode(code: string) {
    const room = await this.rooms.findOne({
      where: { code },
      relations: { questions: true },
      order: { questions: { createdAt: 'DESC' } },
    })
    if (!room) throw new NotFoundException('房间不存在')
    return this.normalizeRoom(room)
  }

  async update(code: string, dto: UpdateRoomDto, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    Object.assign(room, dto)
    const saved = await this.rooms.save(room)
    const next = await this.findByCode(saved.code)
    this.gateway.emitRoom(next)
    return next
  }

  async addQuestion(code: string, dto: CreateQuestionDto, user: User) {
    const room = await this.findEntityByCode(code)
    await this.questions.save(this.questions.create({ text: dto.text, author: user, room }))
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    return next
  }

  async updateQuestion(code: string, questionId: string, dto: UpdateQuestionDto, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    const question = await this.questions.findOne({
      where: { id: questionId },
      relations: { room: true },
    })
    if (!question || question.room.id !== room.id) throw new NotFoundException('问题不存在')
    if (dto.verdict) {
      question.verdict = dto.verdict
      question.answeredAt = new Date()
    }
    if (typeof dto.important === 'boolean') {
      question.important = dto.important
    }
    if (dto.quality) {
      question.quality = dto.quality
    }
    if (dto.truthGuess) {
      question.truthGuess = dto.truthGuess
    }
    if (typeof dto.firstCoreClue === 'boolean') {
      question.firstCoreClue = dto.firstCoreClue
    }
    if (typeof dto.firstMainLogic === 'boolean') {
      question.firstMainLogic = dto.firstMainLogic
    }
    if (typeof dto.firstFullSolve === 'boolean') {
      question.firstFullSolve = dto.firstFullSolve
    }
    await this.questions.save(question)
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    return next
  }

  async reveal(code: string, user: User) {
    const room = await this.findByCode(code)
    this.assertHost(room, user)
    if (room.revealed && room.settlement) {
      return room.settlement
    }

    const settlement = this.calculateSettlement(room)
    for (const entry of settlement.entries) {
      const target = await this.usersService.findById(entry.user.id)
      if (!target) continue
      target.points += entry.total
      target.rankTitle = this.getRankTitle(target.points)
      await this.usersService.save(target)
      entry.user.points = target.points
      entry.user.rankTitle = target.rankTitle
    }

    const entity = await this.findEntityByCode(code)
    entity.revealed = true
    entity.solved = true
    entity.settlement = settlement
    await this.rooms.save(entity)
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    this.gateway.server.to(room.code).emit('room-revealed', settlement)
    return settlement
  }

  async removeQuestion(code: string, questionId: string, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    await this.questions.delete({ id: questionId })
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    return next
  }

  private async findEntityByCode(code: string) {
    const room = await this.rooms.findOne({ where: { code }, relations: { host: true } })
    if (!room) throw new NotFoundException('房间不存在')
    return room
  }

  private assertHost(room: Room, user: User) {
    if (room.host.id !== user.id) throw new ForbiddenException('只有主持人可以操作')
  }

  private async generateRoomCode() {
    for (let i = 0; i < 10; i += 1) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const exists = await this.rooms.exist({ where: { code } })
      if (!exists) return code
    }
    return crypto.randomUUID().slice(0, 8).toUpperCase()
  }

  private normalizeRoom(room: Room) {
    room.questions = [...(room.questions ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    room.questions.forEach((question) => {
      question.important = Boolean(question.important)
      question.quality = question.quality ?? QuestionQuality.None
      question.truthGuess = question.truthGuess ?? TruthGuess.None
      question.firstCoreClue = Boolean(question.firstCoreClue)
      question.firstMainLogic = Boolean(question.firstMainLogic)
      question.firstFullSolve = Boolean(question.firstFullSolve)
    })
    return room
  }

  private calculateSettlement(room: Room) {
    const entries = new Map<
      string,
      {
        user: {
          id: string
          username: string
          displayName: string
          avatarDataUrl: string
          points: number
          rankTitle: string
        }
        total: number
        breakdown: Record<string, number>
        validQuestionCount: number
        keyQuestionCount: number
        fullSolveAt?: number
      }
    >()

    const ensure = (target: User) => {
      const existing = entries.get(target.id)
      if (existing) return existing
      const entry = {
        user: {
          id: target.id,
          username: target.username,
          displayName: target.displayName,
          avatarDataUrl: target.avatarDataUrl ?? '',
          points: target.points ?? 0,
          rankTitle: target.rankTitle ?? '路人甲',
        },
        total: 0,
        breakdown: {} as Record<string, number>,
        validQuestionCount: 0,
        keyQuestionCount: 0,
        fullSolveAt: undefined,
      }
      entries.set(target.id, entry)
      return entry
    }

    const add = (target: User, label: string, points: number) => {
      if (points <= 0) return
      const entry = ensure(target)
      entry.breakdown[label] = (entry.breakdown[label] ?? 0) + points
      entry.total += points
    }

    const players = new Map<string, User>()
    room.questions.forEach((question) => {
      players.set(question.author.id, question.author)
    })
    players.delete(room.host.id)

    players.forEach((player) => {
      add(player, '参与一局', 10)
      add(player, '完整玩到结算', 5)
    })

    add(room.host, '创建海龟汤', 20)
    add(room.host, '游戏成功开始', players.size > 0 ? 10 : 0)
    add(room.host, '参与人数奖励', players.size >= 10 ? 30 : players.size >= 6 ? 20 : players.size >= 3 ? 10 : 0)

    const qualityScore: Record<QuestionQuality, number> = {
      [QuestionQuality.None]: 0,
      [QuestionQuality.Helpful]: 2,
      [QuestionQuality.Key]: 5,
      [QuestionQuality.Breakthrough]: 10,
    }
    const guessScore: Record<TruthGuess, number> = {
      [TruthGuess.None]: 0,
      [TruthGuess.Clue]: 10,
      [TruthGuess.Motive]: 15,
      [TruthGuess.Full]: 30,
    }

    const questionPoints = new Map<string, number>()
    const reasoningPoints = new Map<string, number>()

    room.questions.forEach((question) => {
      if (question.author.id === room.host.id) return
      const entry = ensure(question.author)
      const quality = question.quality ?? QuestionQuality.None
      const truthGuess = question.truthGuess ?? TruthGuess.None
      const qPoints = qualityScore[quality]
      const gPoints = guessScore[truthGuess]

      if (qPoints > 0) {
        entry.validQuestionCount += 1
        if (quality === QuestionQuality.Key || quality === QuestionQuality.Breakthrough) {
          entry.keyQuestionCount += 1
        }
        questionPoints.set(question.author.id, (questionPoints.get(question.author.id) ?? 0) + qPoints)
      }
      if (gPoints > 0) {
        reasoningPoints.set(question.author.id, (reasoningPoints.get(question.author.id) ?? 0) + gPoints)
      }

      if (question.firstCoreClue) add(question.author, '首次发现核心线索', 10)
      if (question.firstMainLogic) add(question.author, '首次还原主要逻辑', 15)
      if (question.firstFullSolve) {
        add(question.author, '首位完整破解', 20)
        entry.fullSolveAt = new Date(question.createdAt).getTime()
      }
    })

    questionPoints.forEach((points, userId) => {
      const target = entries.get(userId)
      if (target) {
        const capped = Math.min(points, 50)
        target.breakdown['有效问题'] = (target.breakdown['有效问题'] ?? 0) + capped
        target.total += capped
      }
    })

    reasoningPoints.forEach((points, userId) => {
      const target = entries.get(userId)
      if (target) {
        const capped = Math.min(points, 100)
        target.breakdown['猜中真相'] = (target.breakdown['猜中真相'] ?? 0) + capped
        target.total += capped
      }
    })

    const playerEntries = [...entries.values()].filter((entry) => entry.user.id !== room.host.id)
    const reasoningKing = [...playerEntries].sort((a, b) => b.validQuestionCount - a.validQuestionCount)[0]
    if (reasoningKing?.validQuestionCount) {
      reasoningKing.breakdown['MVP 推理王'] = (reasoningKing.breakdown['MVP 推理王'] ?? 0) + 20
      reasoningKing.total += 20
    }
    const bestQuestion = [...playerEntries].sort((a, b) => b.keyQuestionCount - a.keyQuestionCount)[0]
    if (bestQuestion?.keyQuestionCount) {
      bestQuestion.breakdown['MVP 神之一问'] = (bestQuestion.breakdown['MVP 神之一问'] ?? 0) + 15
      bestQuestion.total += 15
    }
    const detective = [...playerEntries]
      .filter((entry) => typeof entry.fullSolveAt === 'number')
      .sort((a, b) => (a.fullSolveAt ?? 0) - (b.fullSolveAt ?? 0))[0]
    if (detective) {
      detective.breakdown['MVP 神探'] = (detective.breakdown['MVP 神探'] ?? 0) + 30
      detective.total += 30
    }

    const sorted = [...entries.values()].sort((a, b) => b.total - a.total)
    let rank = 0
    let lastScore: number | null = null
    sorted.forEach((entry, index) => {
      if (entry.total !== lastScore) {
        rank = index + 1
        lastScore = entry.total
      }
      ;(entry as typeof entry & { rank: number }).rank = rank
    })

    return {
      roomCode: room.code,
      revealedAt: new Date().toISOString(),
      answer: room.answer,
      entries: sorted,
    }
  }

  private getRankTitle(points: number) {
    if (points >= 10000) return '传奇汤神'
    if (points >= 6000) return '海龟王'
    if (points >= 3000) return '推理大师'
    if (points >= 1500) return '高级侦探'
    if (points >= 800) return '见习神探'
    if (points >= 300) return '推理学徒'
    if (points >= 100) return '新手侦探'
    return '路人甲'
  }
}
