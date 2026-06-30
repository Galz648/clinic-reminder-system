import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reminder and start its durable workflow' })
  @ApiCreatedResponse({ type: ReminderResponseDto })
  create(@Body() dto: CreateReminderDto): Promise<ReminderResponseDto> {
    return this.remindersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reminders' })
  @ApiOkResponse({ type: ReminderResponseDto, isArray: true })
  findAll(): Promise<ReminderResponseDto[]> {
    return this.remindersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one reminder by id' })
  @ApiOkResponse({ type: ReminderResponseDto })
  @ApiNotFoundResponse()
  async findOne(@Param('id') id: string): Promise<ReminderResponseDto> {
    const reminder = await this.remindersService.findOne(id);
    if (!reminder) {
      throw new NotFoundException(`Reminder ${id} not found`);
    }

    return reminder;
  }
}
