import { ProfessionalDirectoryService } from '../services/professional-directory.service.js';
import { parseDirectoryCursor } from '../dto/professional-directory.js';
import type { ProfessionalDirectory } from '../dto/professional-directory.js';
import {
  Body,
  Get,
  Query,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AllowedRoles } from '../../auth/decorators/access.decorator.js';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';
import type { ActivationLink } from '../../auth/dto/activation-link.js';
import { ProfessionalOnboardingService } from '../services/professional-onboarding.service.js';
import {
  parseCreateProfessionalInput,
  assertEmptyInvitationInput,
} from '../dto/create-professional-input.js';
import type { ProfessionalInvitation } from '../dto/professional-invitation.js';

@Controller('professionals')
@AllowedRoles('administrator')
export class ProfessionalsController {
  constructor(
    @Inject(ProfessionalOnboardingService)
    private readonly onboarding: ProfessionalOnboardingService,
    @Inject(ProfessionalDirectoryService)
    private readonly directory: ProfessionalDirectoryService,
  ) {}
  @Get()
  list(@Query() query: unknown): Promise<ProfessionalDirectory> {
    return this.directory.list(parseDirectoryCursor(query));
  }

  @Post()
  async create(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProfessionalInvitation> {
    if (!request.auth) throw new UnauthorizedException();
    return this.onboarding.create(
      parseCreateProfessionalInput(body),
      request.auth,
    );
  }
  @Post(':id/activation')
  async reissue(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<ActivationLink> {
    if (!request.auth) throw new UnauthorizedException();
    assertEmptyInvitationInput(body);
    return this.onboarding.reissue(id, request.auth);
  }
}
