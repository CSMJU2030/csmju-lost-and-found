import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { ClaimsService } from '../claims/claims.service';
import { ItemStatsView } from '../items/dto/item-view.dto';
import { ItemsService } from '../items/items.service';
import { MembersService } from '../members/members.service';

/** ตัวเลขสรุปสำหรับแดชบอร์ดเจ้าหน้าที่ */
@Controller('v1/stats')
export class StatsController {
  constructor(
    private readonly items: ItemsService,
    private readonly claims: ClaimsService,
    private readonly members: MembersService,
  ) {}

  @RequirePermissions(Permission.STATS_READ)
  @Get()
  async get(): Promise<ItemStatsView> {
    const [items, pendingClaims, totalUsers] = await Promise.all([
      this.items.statusCounts(),
      this.claims.countPending(),
      this.members.count(),
    ]);
    return { ...items, pendingClaims, totalUsers };
  }
}
