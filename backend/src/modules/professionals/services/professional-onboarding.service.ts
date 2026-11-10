import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import { lockAccounts } from '../../accounts/services/locked-accounts.js';
import { ProfessionalEntity } from '../entities/professional.entity.js';
import type { CreateProfessionalInput } from '../dto/create-professional-input.js';
import type { ProfessionalInvitation } from '../dto/professional-invitation.js';
import type { SessionContext } from '../../auth/auth.types.js';
import type { ActivationLink } from '../../auth/dto/activation-link.js';
import { AccountActivationService } from '../../auth/services/account-activation.service.js';
import { requireAdministrator } from './administrator-access.js';

@Injectable()
export class ProfessionalOnboardingService {
  constructor(
    @Inject(DataSource) private readonly source: DataSource,
    @Inject(AccountActivationService)
    private readonly activation: AccountActivationService,
  ) {}

  async create(
    input: CreateProfessionalInput,
    context: SessionContext,
  ): Promise<ProfessionalInvitation> {
    return this.source.transaction(async (manager) => {
      const locked = await lockAccounts(manager, [context.user.id]);
      const { account: administrator, now } = await requireAdministrator(
        manager,
        context,
        locked.get(context.user.id),
      );
      const accounts = manager.getRepository(AccountEntity);
      if (await accounts.existsBy({ username: input.username }))
        throw new ConflictException();
      const account = accounts.create({
        id: randomUUID(),
        name: input.name,
        username: input.username,
        role: 'professional',
        status: 'pending',
        passwordHash: null,
        createdAt: now,
        updatedAt: now,
        lastSignedInAt: null,
      });
      try {
        await accounts.insert(account);
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          typeof error.driverError === 'object' &&
          error.driverError !== null &&
          'code' in error.driverError &&
          error.driverError.code === 'ER_DUP_ENTRY'
        )
          throw new ConflictException();
        throw error;
      }
      const id = randomUUID();
      await manager
        .getRepository(ProfessionalEntity)
        .insert({
          id,
          accountId: account.id,
          accountRole: 'professional',
          createdByAccountId: administrator.id,
          createdByRole: 'administrator',
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        });
      const activation = await this.activation.issue(
        manager,
        account,
        administrator,
        now,
      );
      return {
        professional: {
          id,
          accountId: account.id,
          name: account.name,
          username: account.username,
          status: 'pending',
        },
        activation,
      };
    });
  }

  async reissue(id: string, context: SessionContext): Promise<ActivationLink> {
    const found = await this.source
      .getRepository(ProfessionalEntity)
      .findOneBy({ id });
    if (!found) throw new NotFoundException();
    return this.source.transaction(async (manager) => {
      const accounts = await lockAccounts(manager, [
        context.user.id,
        found.accountId,
      ]);
      const profile = await manager
        .getRepository(ProfessionalEntity)
        .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      const { account: administrator, now } = await requireAdministrator(
        manager,
        context,
        accounts.get(context.user.id),
      );
      const account = accounts.get(found.accountId);
      if (
        !profile ||
        profile.accountId !== found.accountId ||
        profile.archivedAt !== null ||
        !account
      )
        throw new ConflictException();
      return this.activation.issue(manager, account, administrator, now);
    });
  }
}
