import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Question } from './question.entity'

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  code: string

  @Column()
  title: string

  @Column('text')
  surface: string

  @Column('text')
  answer: string

  @Column('text', { default: '' })
  canvasDataUrl: string

  @Column('simple-json', { nullable: true })
  ambience?: {
    backgroundImageDataUrl?: string
    backgroundPreset?: 'light' | 'mist' | 'archive' | 'noir'
    musicDataUrl?: string
    musicName?: string
    musicVolume?: number
  } | null

  @Column({ default: false })
  solved: boolean

  @Column({ default: false })
  revealed: boolean

  @Column('simple-json', { nullable: true })
  settlement?: unknown | null

  @Column('simple-json', { nullable: true })
  soupHistory?: Array<{
    id: string
    title: string
    surface: string
    answer: string
    host?: {
      id: string
      displayName: string
      username: string
    }
    startedAt: string
    revealedAt?: string
    ratingAverage?: number
    ratingCount?: number
  }> | null

  @Column('simple-json', { nullable: true })
  ratingMap?: Record<string, number> | null

  @ManyToOne(() => User, (user) => user.hostedRooms, { eager: true, onDelete: 'CASCADE' })
  host: User

  @OneToMany(() => Question, (question) => question.room, {
    cascade: true,
    eager: true,
  })
  questions: Question[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
