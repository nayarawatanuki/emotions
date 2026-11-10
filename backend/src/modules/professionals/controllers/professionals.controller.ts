import {
  Body,
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
  ) {}
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
