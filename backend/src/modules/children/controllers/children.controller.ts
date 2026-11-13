import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AllowedRoles } from '../../auth/decorators/access.decorator.js';
import type {
  AuthenticatedRequest,
  SessionContext,
} from '../../auth/auth.types.js';
import { ChildrenService } from '../services/children.service.js';
import { parseCreateChildInput } from '../dto/create-child-input.js';
import { parseUuidCursor } from '../../../common/validation/uuid-cursor.js';
import type { ChildDirectory, ChildView } from '../dto/child-view.js';
function context(request: AuthenticatedRequest): SessionContext {
  if (!request.auth) throw new UnauthorizedException();
  return request.auth;
}
@Controller('children')
@AllowedRoles('professional')
export class ChildrenController {
  constructor(
    @Inject(ChildrenService) private readonly children: ChildrenService,
  ) {}
  @Get() list(
    @Req() request: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<ChildDirectory> {
    return this.children.list(context(request), parseUuidCursor(query));
  }
  @Get(':id') detail(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ChildView> {
    return this.children.detail(context(request), id);
  }
  @Post() create(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<ChildView> {
    return this.children.create(context(request), parseCreateChildInput(body));
  }
}
