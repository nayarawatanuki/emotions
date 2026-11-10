import type { ActivationLink } from '../../auth/dto/activation-link.js';

export interface ProfessionalInvitation {
  professional: {
    id: string;
    accountId: string;
    name: string;
    username: string;
    status: 'pending';
  };
  activation: ActivationLink;
}
