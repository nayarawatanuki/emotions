import { uploadImageMediaTypes } from '../../files/services/image-policy.js';
import { parseUpdateChildInput } from '../dto/update-child-input.js';
import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Put,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AllowedRoles,
  WriteMediaTypes,
} from '../../auth/decorators/access.decorator.js';
import type {
  AuthenticatedRequest,
  SessionContext,
} from '../../auth/auth.types.js';
import { ChildPhotoService } from '../services/child-photo.service.js';
import { ChildrenService } from '../services/children.service.js';
import { parseCreateChildInput } from '../dto/create-child-input.js';
import { parseChildDirectoryQuery } from '../dto/child-directory-query.js';
import { parseArchiveChildInput } from '../dto/archive-child-input.js';
import type { ChildDirectory, ChildView } from '../dto/child-view.js';
function context(request: AuthenticatedRequest): SessionContext {
  if (!request.auth) throw new UnauthorizedException();
  return request.auth;
}
@Controller('children')
@AllowedRoles('professional')
export class ChildrenController {
  constructor(
    @Inject(ChildPhotoService)
    private readonly photos: ChildPhotoService,
    @Inject(ChildrenService) private readonly children: ChildrenService,
  ) {}
  @Get() list(
    @Req() request: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<ChildDirectory> {
    const { after, archived } = parseChildDirectoryQuery(query);
    return this.children.list(context(request), after, archived);
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
  @Patch(':id') update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<ChildView> {
    return this.children.update(
      context(request),
      id,
      parseUpdateChildInput(body),
    );
  }
  @Get(':id/photo')
  @Header('Cross-Origin-Resource-Policy', 'same-origin')
  async readPhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<StreamableFile> {
    const bytes = await this.photos.read(context(request), id);
    return new StreamableFile(bytes, { type: 'image/webp' });
  }

  @Put(':id/photo')
  @WriteMediaTypes(...uploadImageMediaTypes)
  uploadPhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ChildView> {
    return this.photos.upload(context(request), id, request);
  }
  @Patch(':id/archive') archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<ChildView> {
    return this.children.setArchived(
      context(request),
      id,
      parseArchiveChildInput(body),
    );
  }
}
