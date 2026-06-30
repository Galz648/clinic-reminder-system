import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { CasesService } from '../cases/cases.service';
import type { AppDatabase } from '../db';
import { DATABASE } from '../db/db.constants';
import { reminders } from '../db/schema';
import { OwnersService } from '../owners/owners.service';
import { TemporalClientService } from '../temporal/temporal-client/temporal-client.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import type { ReminderStatus, ReminderType } from './reminder.types';

@Injectable()
export class RemindersService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDatabase,
    private readonly casesService: CasesService,
    private readonly ownersService: OwnersService,
    private readonly temporalClient: TemporalClientService,
  ) {}

  async create(dto: CreateReminderDto): Promise<ReminderResponseDto> {
    await this.assertCreateReminderInput(dto);

    const reminderId = randomUUID();

    await this.db.insert(reminders).values({
      id: reminderId,
      caseId: dto.caseId,
      ownerId: dto.ownerId,
      phoneNumberId: dto.phoneNumberId,
      reminderType: dto.reminderType,
      message: dto.message,
      dueAt: dto.dueAt,
      status: 'pending',
    });

    const reminder = await this.findById(reminderId);
    if (!reminder) {
      throw new NotFoundException(`Reminder ${reminderId} not found after create`);
    }

    const delivery = await this.findDeliveryContext(reminder.id);
    if (!delivery) {
      throw new NotFoundException(`Reminder ${reminder.id} not found after create`);
    }

    const workflowId = await this.temporalClient.startReminderWorkflow({
      reminderId: reminder.id,
      dueAt: reminder.dueAt,
      message: {
        reminderId: reminder.id,
        caseId: reminder.caseId,
        ownerId: reminder.ownerId,
        phoneNumberId: reminder.phoneNumberId,
        phone: delivery.phone,
        petName: delivery.petName,
        ownerName: delivery.ownerName,
        reminderType: dto.reminderType,
        message: dto.message,
        dueAt: dto.dueAt,
      },
    });

    return { ...reminder, workflowId };
  }

  async findAll(): Promise<ReminderResponseDto[]> {
    const rows = await this.db.query.reminders.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<ReminderResponseDto | null> {
    return this.findById(id);
  }

  private async findById(id: string): Promise<ReminderResponseDto | null> {
    const row = await this.db.query.reminders.findFirst({
      where: eq(reminders.id, id),
    });

    return row ? this.toResponse(row) : null;
  }

  private async findDeliveryContext(id: string) {
    const row = await this.db.query.reminders.findFirst({
      where: eq(reminders.id, id),
      with: {
        case: true,
        owner: true,
        phoneNumber: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...this.toResponse(row),
      phone: row.phoneNumber.phone,
      petName: row.case.petName,
      ownerName: row.owner.name,
    };
  }

  private async assertCreateReminderInput(dto: CreateReminderDto): Promise<void> {
    const petCase = await this.casesService.findById(dto.caseId);
    if (!petCase) {
      throw new NotFoundException(`Case ${dto.caseId} not found`);
    }

    const owner = await this.ownersService.findById(dto.ownerId);
    if (!owner) {
      throw new NotFoundException(`Owner ${dto.ownerId} not found`);
    }

    const isLinked = await this.casesService.isOwnerLinked(dto.caseId, dto.ownerId);
    if (!isLinked) {
      throw new BadRequestException(
        `Owner ${dto.ownerId} is not linked to case ${dto.caseId}`,
      );
    }

    const phoneNumber = await this.ownersService.findPhoneNumberById(dto.phoneNumberId);
    if (!phoneNumber) {
      throw new NotFoundException(`Phone number ${dto.phoneNumberId} not found`);
    }

    if (phoneNumber.ownerId !== dto.ownerId) {
      throw new BadRequestException(
        `Phone number ${dto.phoneNumberId} does not belong to owner ${dto.ownerId}`,
      );
    }
  }

  private toResponse(row: typeof reminders.$inferSelect): ReminderResponseDto {
    return {
      id: row.id,
      caseId: row.caseId,
      ownerId: row.ownerId,
      phoneNumberId: row.phoneNumberId,
      reminderType: row.reminderType as ReminderType,
      message: row.message,
      dueAt: row.dueAt,
      status: row.status as ReminderStatus,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    };
  }
}
