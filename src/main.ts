import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const corsOrigin = config
    .get('CORS_ORIGIN', '*')
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean)

  app.enableCors({
    origin: corsOrigin.includes('*') ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  const port = config.get('PORT', 3001)
  await app.listen(port)
  console.log(`Turtle Soup API is running on http://127.0.0.1:${port}`)
}

bootstrap()
