import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { MemberView } from './member-view.dto';
import { MembersService, toMemberView } from './members.service';

@Controller('v1/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  /** ผู้ใช้ทั้งหมด (เจ้าหน้าที่) */
  @RequirePermissions(Permission.MEMBER_READ_ANY)
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<CollectionResult<MemberView>> {
    return this.members.list(query.page ?? 1, query.limit ?? 20);
  }

  /** แถวใน members ของผู้เรียกเอง (id ที่ใช้เทียบกับ reporterId / claimantId) */
  @Get('me')
  async me(@CurrentUser() user: CoreHubIdentity): Promise<MemberView> {
    return toMemberView(await this.members.resolve(user));
  }
}
