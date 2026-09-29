import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { MembersService } from '../members/members.service';
import { ClaimsService } from './claims.service';
import { ClaimView, CreateClaimDto, QueryClaimsDto, VerifyCodeDto } from './dto/claim.dto';

/** คำขอรับคืน / แจ้งส่งคืน */
@Controller('v1/claims')
export class ClaimsController {
  constructor(
    private readonly claims: ClaimsService,
    private readonly members: MembersService,
  ) {}

  /** เจ้าหน้าที่: ทั้งหมด · ผู้ใช้ทั่วไป (หรือ `?scope=mine`): คำขอที่ฉันยื่น + คำขอกับรายการของฉัน */
  @RequirePermissions(Permission.CLAIM_READ_ANY, Permission.CLAIM_READ_OWN)
  @Get()
  async list(@CurrentUser() user: CoreHubIdentity, @Query() query: QueryClaimsDto): Promise<CollectionResult<ClaimView>> {
    return this.claims.list(await this.members.actorFor(user), query);
  }

  @RequirePermissions(Permission.CLAIM_CREATE)
  @Post()
  async create(@CurrentUser() user: CoreHubIdentity, @Body() dto: CreateClaimDto): Promise<ClaimView> {
    return this.claims.create(await this.members.actorFor(user), dto);
  }

  /** อนุมัติ และออกรหัส 6 หลักให้ผู้ยื่น */
  @RequirePermissions(Permission.CLAIM_REVIEW)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string): Promise<ClaimView> {
    return this.claims.approve(await this.members.actorFor(user), id);
  }

  @RequirePermissions(Permission.CLAIM_REVIEW)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string): Promise<ClaimView> {
    return this.claims.reject(await this.members.actorFor(user), id);
  }

  /** ผู้ส่ง/ผู้รับยืนยันการส่งมอบฝั่งตัวเอง ครบสองฝ่ายแล้วปิดคำขออัตโนมัติ */
  @RequirePermissions(Permission.CLAIM_CONFIRM_OWN)
  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string): Promise<ClaimView> {
    return this.claims.confirm(await this.members.actorFor(user), id);
  }

  /** เจ้าหน้าที่ยืนยันรหัส 6 หลัก (กรณีส่งผ่านห้องเจ้าหน้าที่) */
  @RequirePermissions(Permission.CLAIM_VERIFY)
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyCodeDto,
  ): Promise<ClaimView> {
    return this.claims.verify(await this.members.actorFor(user), id, dto.code);
  }
}
