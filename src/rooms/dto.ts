import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator'
import { QuestionQuality, TruthGuess, Verdict } from '../common/enums'

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  soupId?: string

  @IsOptional()
  @IsString()
  @Length(2, 60)
  title?: string

  @IsOptional()
  @IsString()
  @Length(8, 2000)
  surface?: string

  @IsOptional()
  @IsString()
  @Length(8, 4000)
  answer?: string
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  title?: string

  @IsOptional()
  @IsString()
  @Length(8, 2000)
  surface?: string

  @IsOptional()
  @IsString()
  @Length(8, 4000)
  answer?: string

  @IsOptional()
  @IsString()
  canvasDataUrl?: string

  @IsOptional()
  @IsBoolean()
  solved?: boolean
}

export class CreateQuestionDto {
  @IsString()
  @Length(1, 500)
  text: string
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsIn([Verdict.Yes, Verdict.No, Verdict.Both, Verdict.Irrelevant])
  verdict?: Verdict

  @IsOptional()
  @IsBoolean()
  important?: boolean

  @IsOptional()
  @IsIn([QuestionQuality.None, QuestionQuality.Helpful, QuestionQuality.Key, QuestionQuality.Breakthrough])
  quality?: QuestionQuality

  @IsOptional()
  @IsIn([TruthGuess.None, TruthGuess.Clue, TruthGuess.Motive, TruthGuess.Full])
  truthGuess?: TruthGuess

  @IsOptional()
  @IsBoolean()
  firstCoreClue?: boolean

  @IsOptional()
  @IsBoolean()
  firstMainLogic?: boolean

  @IsOptional()
  @IsBoolean()
  firstFullSolve?: boolean
}
