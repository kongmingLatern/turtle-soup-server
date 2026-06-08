import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { QuestionQuality, TruthGuess, Verdict } from '../common/enums'
import { User } from '../users/user.entity'
import { Room } from './room.entity'

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('text')
  text: string

  @Column({ type: 'varchar', nullable: true })
  verdict?: Verdict | null

  @Column({ default: false })
  important: boolean

  @Column({ type: 'varchar', default: QuestionQuality.None })
  quality: QuestionQuality

  @Column({ type: 'varchar', default: TruthGuess.None })
  truthGuess: TruthGuess

  @Column({ default: false })
  firstCoreClue: boolean

  @Column({ default: false })
  firstMainLogic: boolean

  @Column({ default: false })
  firstFullSolve: boolean

  @ManyToOne(() => User, (user) => user.questions, { eager: true, onDelete: 'CASCADE' })
  author: User

  @ManyToOne(() => Room, (room) => room.questions, { onDelete: 'CASCADE' })
  room: Room

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'datetime', nullable: true })
  answeredAt?: Date | null
}
