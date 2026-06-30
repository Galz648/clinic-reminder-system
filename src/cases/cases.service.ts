import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '../db';
import { DATABASE } from '../db/db.constants';
import { caseOwners, cases } from '../db/schema';
import { OwnersService } from '../owners/owners.service';
import { CaseResponseDto } from './dto/case-response.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { LinkCaseOwnerDto } from './dto/link-case-owner.dto';

@Injectable()
export class CasesService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly ownersService: OwnersService,
  ) {}

  async create(dto: CreateCaseDto): Promise<CaseResponseDto> {
    const id = randomUUID();

    await this.db.insert(cases).values({ id, petName: dto.petName });

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to load case after insert');
    }

    return created;
  }

  list(): Promise<CaseResponseDto[]> {
    return this.db.query.cases.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  async findById(id: string): Promise<CaseResponseDto | null> {
    const row = await this.db.query.cases.findFirst({
      where: eq(cases.id, id),
    });

    return row ?? null;
  }

  async linkOwner(
    caseId: string,
    dto: LinkCaseOwnerDto,
  ): Promise<{ caseId: string; ownerId: string }> {
    const petCase = await this.findById(caseId);
    if (!petCase) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const owner = await this.ownersService.findById(dto.ownerId);
    if (!owner) {
      throw new NotFoundException(`Owner ${dto.ownerId} not found`);
    }

    await this.db.insert(caseOwners).values({ caseId, ownerId: dto.ownerId });

    return { caseId, ownerId: dto.ownerId };
  }

  async isOwnerLinked(caseId: string, ownerId: string): Promise<boolean> {
    const row = await this.db.query.caseOwners.findFirst({
      where: and(eq(caseOwners.caseId, caseId), eq(caseOwners.ownerId, ownerId)),
    });

    return row !== undefined;
  }
}
