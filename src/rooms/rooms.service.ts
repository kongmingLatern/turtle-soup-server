import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { QuestionQuality, TruthGuess } from '../common/enums'
import { SoupsService } from '../soups/soups.service'
import { User } from '../users/user.entity'
import { UsersService } from '../users/users.service'
import {
  CreateQuestionDto,
  CreateRoomDto,
  RateSoupDto,
  SelectMvpDto,
  SwitchSoupDto,
  TransferHostDto,
  UpdateQuestionDto,
  UpdateRoomDto,
} from './dto'
import { Question } from './question.entity'
import { Room } from './room.entity'
import { RoomsGateway } from './rooms.gateway'

import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

type PublicUser = {
  id: string
  username: string
  displayName: string
  avatarDataUrl?: string
  points: number
  rankTitle: string
}

type PublicQuestion = {
  id: string
  text: string
  verdict?: string | null
  important: boolean
  quality: QuestionQuality
  truthGuess: TruthGuess
  firstCoreClue: boolean
  firstMainLogic: boolean
  firstFullSolve: boolean
  author: PublicUser
  createdAt: Date
  answeredAt?: Date | null
}

type RoomPayload = {
  id: string
  code: string
  title: string
  surface: string
  answer: string
  canvasDataUrl: string
  ambience?: Room['ambience']
  solved: boolean
  revealed: boolean
  settlement?: unknown | null
  mvp?: Room['mvp']
  soupHistory: NonNullable<Room['soupHistory']>
  ratingMap: Record<string, number>
  host: PublicUser
  questions: PublicQuestion[]
  avatarCache: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

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
    const source = dto.soupId ? await this.soupsService.findOwnedById(dto.soupId, host) : null

    const room = await this.rooms.save(
      this.rooms.create({
        code: await this.generateRoomCode(),
        title: dto.title ?? source?.title ?? '新海龟汤局',
        surface: dto.surface ?? source?.surface ?? '主持人正在编辑汤面。',
        answer: dto.answer ?? source?.answer ?? '主持人正在编辑汤底。',
        host,
        questions: [],
        soupHistory: [],
        ratingMap: {},
      }),
    )
    return this.findByCode(room.code)
  }

  async findByCode(code: string) {
    const room = await this.findEntityByCodeWithQuestions(code)
    return this.serializeRoom(room)
  }

  async update(code: string, dto: UpdateRoomDto, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    const { ambience, backgroundImageDataUrl, musicDataUrl, musicName, musicVolume, ...roomPatch } = dto
    Object.assign(room, roomPatch)
    if (
      ambience ||
      typeof backgroundImageDataUrl === 'string' ||
      typeof musicDataUrl === 'string' ||
      typeof musicName === 'string' ||
      typeof musicVolume === 'number'
    ) {
      room.ambience = {
        ...(room.ambience ?? {}),
        ...(ambience ?? {}),
        ...(typeof backgroundImageDataUrl === 'string' ? { backgroundImageDataUrl } : {}),
        ...(typeof musicDataUrl === 'string' ? { musicDataUrl } : {}),
        ...(typeof musicName === 'string' ? { musicName } : {}),
        ...(typeof musicVolume === 'number' ? { musicVolume } : {}),
      }
    }
    const saved = await this.rooms.save(room)
    const next = await this.findByCode(saved.code)
    this.gateway.emitRoom(next)
    return next
  }

  async switchSoup(code: string, dto: SwitchSoupDto, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    const soup = await this.soupsService.findOwnedById(dto.soupId, user)

    await this.questions
      .createQueryBuilder()
      .delete()
      .from(Question)
      .where('roomId = :roomId', { roomId: room.id })
      .execute()
    room.title = soup.title
    room.surface = soup.surface
    room.answer = soup.answer
    room.canvasDataUrl = ''
    room.solved = false
    room.revealed = false
    room.settlement = null
    room.mvp = null
    room.ratingMap = {}
    room.soupHistory = this.getRevealedSoupHistory(room.soupHistory ?? [])
    room.questions = []
    await this.rooms.save(room)

    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    this.gateway.server.to(room.code).emit('room-reset', {
      roomCode: room.code,
      room: next,
      message: `主持人切换了海龟汤：${soup.title}`,
      at: new Date().toISOString(),
    })
    return next
  }

  async transferHost(code: string, dto: TransferHostDto, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    if (dto.userId === user.id) throw new ForbiddenException('不能把主持人转让给自己')
    if (!this.gateway.isUserOnline(room.code, dto.userId)) {
      throw new ForbiddenException('只能任命当前房间内在线用户为主持人')
    }

    const nextHost = await this.usersService.findById(dto.userId)
    if (!nextHost) throw new NotFoundException('用户不存在')
    room.host = nextHost
    await this.rooms.save(room)

    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    this.gateway.server.to(room.code).emit('room-host-transferred', {
      roomCode: room.code,
      host: {
        id: nextHost.id,
        username: nextHost.username,
        displayName: nextHost.displayName,
        avatarDataUrl: nextHost.avatarDataUrl,
        points: nextHost.points,
        rankTitle: nextHost.rankTitle,
      },
      message: `${user.displayName} 已将主持人交给 ${nextHost.displayName}`,
      at: new Date().toISOString(),
    })
    return next
  }

  async addQuestion(code: string, dto: CreateQuestionDto, user: User) {
    const room = await this.findEntityByCode(code)
    const saved = await this.questions.save(this.questions.create({ text: dto.text, author: user, room }))
    const question = await this.questions.findOne({ where: { id: saved.id } })
    if (!question) throw new NotFoundException('问题不存在')
    const avatarCache = this.createAvatarCache([question.author])
    const payload = this.serializeQuestion(question, { includeAvatar: true })
    this.gateway.server.to(room.code).emit('question-added', {
      roomCode: room.code,
      question: payload,
      avatarCache,
    })
    return payload
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
    const savedQuestion = await this.questions.findOne({ where: { id: question.id } })
    if (!savedQuestion) throw new NotFoundException('问题不存在')
    const payload = this.serializeQuestion(savedQuestion, { includeAvatar: false })
    this.gateway.server.to(room.code).emit('question-updated', {
      roomCode: room.code,
      question: payload,
    })
    return { question: payload }
  }

  async reveal(code: string, user: User) {
    const room = await this.findEntityByCodeWithQuestions(code)
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
    entity.soupHistory = this.recordCurrentSoupRevealed(entity.soupHistory ?? [], entity, user)
    await this.rooms.save(entity)
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    this.gateway.server.to(room.code).emit('room-revealed', settlement)
    return settlement
  }

  async rateSoup(code: string, dto: RateSoupDto, user: User) {
    const room = await this.findEntityByCode(code)
    if (!room.revealed) throw new ForbiddenException('揭秘后才能评分')
    if (room.host.id === user.id) throw new ForbiddenException('主持人不能给自己的汤面评分')
    const rating = Math.min(5, Math.max(1, Math.round(dto.rating)))
    room.ratingMap = { ...(room.ratingMap ?? {}), [user.id]: rating }
    room.soupHistory = this.applyCurrentSoupRating(room.soupHistory ?? [], room.ratingMap)
    await this.rooms.save(room)
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    return next
  }

  async selectMvp(code: string, dto: SelectMvpDto, user: User) {
    const room = await this.findEntityByCodeWithQuestions(code)
    this.assertHost(room, user)
    if (!room.revealed) throw new ForbiddenException('揭秘后才能评定 MVP')
    if (room.mvp) throw new ForbiddenException('本轮 MVP 已评定')
    if (dto.userId === room.host.id) throw new ForbiddenException('主持人不能成为 MVP')

    const target = await this.usersService.findById(dto.userId)
    if (!target) throw new NotFoundException('用户不存在')

    const settlementEntries = (room.settlement as { entries?: Array<{ user: { id: string } }> } | null)?.entries ?? []
    const participated = room.questions.some((question) => question.author.id === dto.userId)
      || settlementEntries.some((entry) => entry.user.id === dto.userId)
    if (!participated) throw new ForbiddenException('只能选择本轮参与玩家')

    const mvp = {
      selectedAt: new Date().toISOString(),
      user: {
        id: target.id,
        username: target.username,
        displayName: target.displayName,
        avatarDataUrl: target.avatarDataUrl ?? '',
        points: target.points ?? 0,
        rankTitle: target.rankTitle ?? '路人甲',
      },
      importantQuestions: [...(room.questions ?? [])]
        .filter((question) => this.hasImportantSignal(question) && question.author.id === dto.userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((question) => ({
          id: question.id,
          text: question.text,
          verdict: question.verdict ?? null,
          important: Boolean(question.important),
          quality: question.quality,
          truthGuess: question.truthGuess,
          firstCoreClue: Boolean(question.firstCoreClue),
          firstMainLogic: Boolean(question.firstMainLogic),
          firstFullSolve: Boolean(question.firstFullSolve),
          author: {
            id: question.author.id,
            username: question.author.username,
            displayName: question.author.displayName,
            avatarDataUrl: question.author.avatarDataUrl ?? '',
          },
          createdAt: question.createdAt.toISOString(),
        })),
    }

    const entity = await this.findEntityByCode(code)
    entity.mvp = mvp
    entity.soupHistory = this.applyCurrentSoupMvp(entity.soupHistory ?? [], mvp)
    await this.rooms.save(entity)
    const next = await this.findByCode(code)
    this.gateway.emitRoom(next)
    this.gateway.server.to(room.code).emit('room-mvp-selected', mvp)
    return mvp
  }

  async removeQuestion(code: string, questionId: string, user: User) {
    const room = await this.findEntityByCode(code)
    this.assertHost(room, user)
    await this.questions.delete({ id: questionId })
    this.gateway.server.to(room.code).emit('question-removed', {
      roomCode: room.code,
      questionId,
    })
    return { questionId }
  }

  private async findEntityByCode(code: string) {
    const room = await this.rooms.findOne({ where: { code }, relations: { host: true } })
    if (!room) throw new NotFoundException('房间不存在')
    return room
  }

  private async findEntityByCodeWithQuestions(code: string) {
    const room = await this.rooms.findOne({
      where: { code },
      relations: { host: true, questions: true },
      order: { questions: { createdAt: 'DESC' } },
    })
    if (!room) throw new NotFoundException('房间不存在')
    return room
  }

  private assertHost(room: Room, user: User) {
    if (room.host.id !== user.id) throw new ForbiddenException('只有主持人可以操作')
  }

  private createSoupSnapshot(title: string, surface: string, answer: string, host: User) {
    
    return {
      id: crypto.randomUUID(),
      title,
      surface,
      answer,
      host: {
        id: host.id,
        username: host.username,
        displayName: host.displayName,
        avatarDataUrl: host.avatarDataUrl ?? '',
      },
      startedAt: new Date().toISOString(),
      ratingAverage: 0,
      ratingCount: 0,
    }
  }

  private getRevealedSoupHistory(history: NonNullable<Room['soupHistory']>) {
    return history.filter((item) => item.revealedAt)
  }

  private recordCurrentSoupRevealed(history: NonNullable<Room['soupHistory']>, room: Room, host: User) {
    const revealedHistory = this.getRevealedSoupHistory(history)
    return [
      ...revealedHistory,
      {
        ...this.createSoupSnapshot(room.title, room.surface, room.answer, host),
        revealedAt: new Date().toISOString(),
      },
    ]
  }

  private applyCurrentSoupRating(history: NonNullable<Room['soupHistory']>, ratingMap: Record<string, number>) {
    const ratings = Object.values(ratingMap)
    const ratingCount = ratings.length
    const ratingAverage = ratingCount
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratingCount) * 10) / 10
      : 0
    return history.map((item, index) =>
      index === history.length - 1 ? { ...item, ratingAverage, ratingCount } : item,
    )
  }

  private applyCurrentSoupMvp(history: NonNullable<Room['soupHistory']>, mvp: NonNullable<Room['mvp']>) {
    return history.map((item, index) =>
      index === history.length - 1 ? { ...item, mvp } : item,
    )
  }

  private hasImportantSignal(question: Question) {
    return Boolean(
      question.important ||
        question.quality !== QuestionQuality.None ||
        question.truthGuess !== TruthGuess.None ||
        question.firstCoreClue ||
        question.firstMainLogic ||
        question.firstFullSolve,
    )
  }

  private async generateRoomCode() {
    for (let i = 0; i < 10; i += 1) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      const exists = await this.rooms.exist({ where: { code } })
      if (!exists) return code
    }
    return crypto.randomUUID().slice(0, 8).toUpperCase()
  }

  private serializeRoom(room: Room): RoomPayload {
    const questions = [...(room.questions ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    const soupHistory = this.getRevealedSoupHistory(room.soupHistory ?? []).map((item) => ({
      ...item,
      host: item.host ?? {
        id: room.host.id,
        username: room.host.username,
        displayName: room.host.displayName,
        avatarDataUrl: room.host.avatarDataUrl ?? '',
      },
    }))
    const avatarCache = this.createAvatarCache([
      room.host,
      ...questions.map((question) => question.author),
    ])

    return {
      id: room.id,
      code: room.code,
      title: room.title,
      surface: room.surface,
      answer: room.answer,
      canvasDataUrl: room.canvasDataUrl,
      ambience: room.ambience ?? null,
      solved: Boolean(room.solved),
      revealed: Boolean(room.revealed),
      settlement: room.settlement ?? null,
      mvp: room.mvp ?? null,
      soupHistory,
      ratingMap: room.ratingMap ?? {},
      host: this.serializeUser(room.host, { includeAvatar: true }),
      questions: questions.map((question) =>
        this.serializeQuestion(question, { includeAvatar: false }),
      ),
      avatarCache,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }
  }

  private serializeQuestion(
    question: Question,
    options: { includeAvatar: boolean },
  ): PublicQuestion {
    return {
      id: question.id,
      text: question.text,
      verdict: question.verdict ?? null,
      important: Boolean(question.important),
      quality: question.quality ?? QuestionQuality.None,
      truthGuess: question.truthGuess ?? TruthGuess.None,
      firstCoreClue: Boolean(question.firstCoreClue),
      firstMainLogic: Boolean(question.firstMainLogic),
      firstFullSolve: Boolean(question.firstFullSolve),
      author: this.serializeUser(question.author, options),
      createdAt: question.createdAt,
      answeredAt: question.answeredAt ?? null,
    }
  }

  private serializeUser(user: User, options: { includeAvatar: boolean }): PublicUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      ...(options.includeAvatar ? { avatarDataUrl: user.avatarDataUrl ?? '' } : {}),
      points: user.points ?? 0,
      rankTitle: user.rankTitle ?? '路人甲',
    }
  }

  private createAvatarCache(users: Array<Pick<User, 'id' | 'avatarDataUrl'> | undefined>) {
    return users.reduce<Record<string, string>>((cache, user) => {
      if (user?.id && user.avatarDataUrl) cache[user.id] = user.avatarDataUrl
      return cache
    }, {})
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
