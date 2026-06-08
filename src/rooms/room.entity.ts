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

  @Column({ default: false })
  solved: boolean

  @Column({ default: false })
  revealed: boolean

  @Column('simple-json', { nullable: true })
  settlement?: unknown

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
