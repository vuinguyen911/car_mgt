import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseModule } from '../common/database/database.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [DatabaseModule, GatewayModule],
  providers: [TasksService],
})
export class TasksModule {}
