import { IsString, Length, Matches } from 'class-validator'

export class RegisterDto {
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
  username: string

  @IsString()
  @Length(4, 40)
  password: string

  @IsString()
  @Length(1, 24)
  displayName: string
}

export class LoginDto {
  @IsString()
  @Length(3, 24)
  username: string

  @IsString()
  @Length(4, 40)
  password: string
}

export class UpdateProfileDto {
  @IsString()
  @Length(0, 200000)
  avatarDataUrl: string
}
