import { AccountEntity } from '../modules/accounts/entities/account.entity.js';
import { ProfessionalEntity } from '../modules/professionals/entities/professional.entity.js';
import { StoredFileEntity } from '../modules/files/entities/stored-file.entity.js';
import { ChildEntity } from '../modules/children/entities/child.entity.js';
import { ActivityEntity } from '../modules/activities/entities/activity.entity.js';
import { ActivityOptionEntity } from '../modules/activities/entities/activity-option.entity.js';
import { RewardEntity } from '../modules/activities/entities/reward.entity.js';
import { ActivityAttemptEntity } from '../modules/results/entities/activity-attempt.entity.js';
import { ActivityResultEntity } from '../modules/results/entities/activity-result.entity.js';

export const databaseEntities = [
  AccountEntity,
  ProfessionalEntity,
  StoredFileEntity,
  ChildEntity,
  ActivityEntity,
  ActivityOptionEntity,
  RewardEntity,
  ActivityAttemptEntity,
  ActivityResultEntity,
];
