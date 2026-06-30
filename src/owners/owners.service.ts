import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../db';
import { DATABASE } from '../db/db.constants';
import { owners, phoneNumbers } from '../db/schema';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';
import { OwnerResponseDto } from './dto/owner-response.dto';
import { PhoneNumberResponseDto } from './dto/phone-number-response.dto';

@Injectable()
export class OwnersService {
  constructor(@Inject(DATABASE) private readonly db: AppDatabase) {}

  async create(dto: CreateOwnerDto): Promise<OwnerResponseDto> {
    const id = randomUUID();

    await this.db.insert(owners).values({ id, name: dto.name });

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to load owner after insert');
    }

    return created;
  }

  list(): Promise<OwnerResponseDto[]> {
    return this.db.query.owners.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  async findById(id: string): Promise<OwnerResponseDto | null> {
    const row = await this.db.query.owners.findFirst({
      where: eq(owners.id, id),
    });

    return row ?? null;
  }

  async addPhoneNumber(
    ownerId: string,
    dto: CreatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    const owner = await this.findById(ownerId);
    if (!owner) {
      throw new NotFoundException(`Owner ${ownerId} not found`);
    }

    const id = randomUUID();
    const normalizedPhone = dto.phone.replace(/\D/g, '');

    await this.db.insert(phoneNumbers).values({
      id,
      ownerId,
      phone: dto.phone,
      normalizedPhone,
    });

    const created = await this.findPhoneNumberById(id);
    if (!created) {
      throw new Error('Failed to load phone number after insert');
    }

    return created;
  }

  async listPhoneNumbers(ownerId: string): Promise<PhoneNumberResponseDto[]> {
    const owner = await this.findById(ownerId);
    if (!owner) {
      throw new NotFoundException(`Owner ${ownerId} not found`);
    }

    return this.db.query.phoneNumbers.findMany({
      where: eq(phoneNumbers.ownerId, ownerId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  async findPhoneNumberById(id: string): Promise<PhoneNumberResponseDto | null> {
    const row = await this.db.query.phoneNumbers.findFirst({
      where: eq(phoneNumbers.id, id),
    });

    return row ?? null;
  }
}
