import { Controller, Get, NotFoundException, Param, Post, Body } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateOwnerDto } from './dto/create-owner.dto';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';
import { OwnerResponseDto } from './dto/owner-response.dto';
import { PhoneNumberResponseDto } from './dto/phone-number-response.dto';
import { OwnersService } from './owners.service';

@ApiTags('owners')
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an owner' })
  @ApiCreatedResponse({ type: OwnerResponseDto })
  create(@Body() dto: CreateOwnerDto): Promise<OwnerResponseDto> {
    return this.ownersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List owners' })
  @ApiOkResponse({ type: OwnerResponseDto, isArray: true })
  list(): Promise<OwnerResponseDto[]> {
    return this.ownersService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owner by id' })
  @ApiOkResponse({ type: OwnerResponseDto })
  @ApiNotFoundResponse()
  async getById(@Param('id') id: string): Promise<OwnerResponseDto> {
    const owner = await this.ownersService.findById(id);
    if (!owner) {
      throw new NotFoundException(`Owner ${id} not found`);
    }

    return owner;
  }

  @Post(':id/phone-numbers')
  @ApiOperation({ summary: 'Add a phone number to an owner' })
  @ApiCreatedResponse({ type: PhoneNumberResponseDto })
  @ApiNotFoundResponse()
  async addPhoneNumber(
    @Param('id') ownerId: string,
    @Body() dto: CreatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    return this.ownersService.addPhoneNumber(ownerId, dto);
  }

  @Get(':id/phone-numbers')
  @ApiOperation({ summary: 'List phone numbers for an owner' })
  @ApiOkResponse({ type: PhoneNumberResponseDto, isArray: true })
  @ApiNotFoundResponse()
  listPhoneNumbers(@Param('id') ownerId: string): Promise<PhoneNumberResponseDto[]> {
    return this.ownersService.listPhoneNumbers(ownerId);
  }
}
