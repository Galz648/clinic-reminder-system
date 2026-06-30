import 'dotenv/config';

import { env } from './config/env';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Clinic Reminder System')
    .setDescription('V0 API — create, list, and inspect reminders')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.port);

  console.log(`API listening on ${env.apiPublicUrl}`);
  console.log(`OpenAPI docs at ${env.apiPublicUrl}/docs`);
}

void bootstrap();
