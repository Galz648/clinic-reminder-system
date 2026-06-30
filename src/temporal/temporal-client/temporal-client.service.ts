import { env } from '../../config/env';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, Connection } from '@temporalio/client';

import type { ReminderMessage } from '../../reminders/reminder.types';

export interface StartReminderWorkflowInput {
  reminderId: string;
  dueAt: string;
  message: ReminderMessage;
}

@Injectable()
export class TemporalClientService implements OnModuleDestroy {
  private readonly logger = new Logger(TemporalClientService.name);
  private connection?: Connection;
  private client?: Client;

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
  }

  async startReminderWorkflow(input: StartReminderWorkflowInput): Promise<string> {
    const client = await this.getClient();
    const handle = await client.workflow.start('reminderWorkflow', {
      taskQueue: env.temporalTaskQueue,
      workflowId: `reminder-${input.reminderId}`,
      args: [input],
    });

    this.logger.log(`Started workflow ${handle.workflowId}`);
    return handle.workflowId;
  }

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.connection = await Connection.connect({ address: env.temporalAddress });
      this.client = new Client({
        connection: this.connection,
        namespace: env.temporalNamespace,
      });
    }

    return this.client;
  }
}
