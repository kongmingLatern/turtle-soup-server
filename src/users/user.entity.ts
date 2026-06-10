import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Soup } from '../soups/soup.entity'
import { Room } from '../rooms/room.entity'
import { Question } from '../rooms/question.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  username: string

  @Column()
  passwordHash: string

  @Column()
  displayName: string

  @Column('text', { default: '' })
  avatarDataUrl: string

  @Column({ default: 0 })
  points: number

  @Column({ default: '路人甲' })
  rankTitle: string

  @CreateDateColumn()
  createdAt: Date

  @OneToMany(() => Soup, (soup) => soup.creator)
  soups: Soup[]

  @OneToMany(() => Room, (room) => room.host)
  hostedRooms: Room[]

  @OneToMany(() => Question, (question) => question.author)
  questions: Question[]
}
