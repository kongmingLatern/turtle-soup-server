import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { User } from '../users/user.entity'

@Entity('soups')
export class Soup {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column('text')
  surface: string

  @Column('text')
  answer: string

  @Column({ default: '悬疑' })
  category: string

  @Column({ default: 'medium' })
  difficulty: 'easy' | 'medium' | 'hard'

  @Column({ default: true })
  isBuiltin: boolean

  @ManyToOne(() => User, (user) => user.soups, { nullable: true, onDelete: 'SET NULL' })
  creator?: User | null

  @CreateDateColumn()
  createdAt: Date
}
