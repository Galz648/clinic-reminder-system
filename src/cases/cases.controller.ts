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

import { CasesService } from './cases.service';
import { CaseResponseDto } from './dto/case-response.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { LinkCaseOwnerDto } from './dto/link-case-owner.dto';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a case (pet)' })
  @ApiCreatedResponse({ type: CaseResponseDto })
  create(@Body() dto: CreateCaseDto): Promise<CaseResponseDto> {
    return this.casesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cases' })
  @ApiOkResponse({ type: CaseResponseDto, isArray: true })
  list(): Promise<CaseResponseDto[]> {
    return this.casesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one case by id' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse()
  async getById(@Param('id') id: string): Promise<CaseResponseDto> {
    const petCase = await this.casesService.findById(id);
    if (!petCase) {
      throw new NotFoundException(`Case ${id} not found`);
    }

    return petCase;
  }

  @Post(':id/owners')
  @ApiOperation({ summary: 'Link an owner to a case (many-to-many)' })
  @ApiCreatedResponse({ description: 'Owner linked to case' })
  @ApiNotFoundResponse()
  linkOwner(
    @Param('id') caseId: string,
    @Body() dto: LinkCaseOwnerDto,
  ): Promise<{ caseId: string; ownerId: string }> {
    return this.casesService.linkOwner(caseId, dto);
  }
}
