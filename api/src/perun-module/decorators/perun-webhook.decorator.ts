import { SetMetadata } from '@nestjs/common';

export const PERUN_WEBHOOK_KEY = 'perunWebhook';
export const PerunWebhook = () => SetMetadata(PERUN_WEBHOOK_KEY, true);
