import { IsIn, IsOptional, IsString, Length } from 'class-validator'

export class CreateSoupDto {
  @IsString()
  @Length(2, 60)
  title: string

  @IsString()
  @Length(8, 12000)
  surface: string

  @IsString()
  @Length(8, 20000)
  answer: string

  @IsOptional()
  @IsString()
  @Length(1, 20)
  category?: string

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard'
}

export class UpdateSoupDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  title?: string

  @IsOptional()
  @IsString()
  @Length(8, 12000)
  surface?: string

  @IsOptional()
  @IsString()
  @Length(8, 20000)
  answer?: string

  @IsOptional()
  @IsString()
  @Length(1, 20)
  category?: string

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard'
}
