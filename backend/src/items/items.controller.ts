import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiExtraModels } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CoreHubIdentity } from '../auth/core-hub-identity';
import { Permission } from '../auth/permissions';
import { CollectionResult } from '../common/api-response';
import { MembersService } from '../members/members.service';
import { CreateItemDto, QueryItemsDto, UpdateItemDto } from './dto/item-input.dto';
import { DeletedView, ItemView, MatchView } from './dto/item-view.dto';
import { ItemsService } from './items.service';

/** รายการแจ้งของหาย / แจ้งพบของ */
// MatchView ส่งอยู่ใน envelope ของ collection จึงต้องประกาศให้ openapi.json มี schema นี้
@ApiExtraModels(MatchView)
@Controller('v1/items')
export class ItemsController {
  constructor(
    private readonly items: ItemsService,
    private readonly members: MembersService,
  ) {}

  /** ค้นหา/กรองรายการ · `?mine=true` = เฉพาะที่ฉันแจ้ง */
  @RequirePermissions(Permission.ITEM_READ)
  @Get()
  async list(@CurrentUser() user: CoreHubIdentity, @Query() query: QueryItemsDto): Promise<CollectionResult<ItemView>> {
    return this.items.list(await this.members.actorFor(user), query);
  }

  /** รายละเอียด (`secretAnswer` เห็นเฉพาะเจ้าของโพสต์/เจ้าหน้าที่) */
  @RequirePermissions(Permission.ITEM_READ)
  @Get(':id')
  async get(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string): Promise<ItemView> {
    return this.items.get(await this.members.actorFor(user), id);
  }

  /** รายการฝั่งตรงข้ามที่อาจเป็นชิ้นเดียวกัน (เรียงตามคะแนน) */
  @RequirePermissions(Permission.ITEM_READ)
  @Get(':id/matches')
  async matches(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CollectionResult<MatchView>> {
    return this.items.matches(await this.members.actorFor(user), id);
  }

  @RequirePermissions(Permission.ITEM_CREATE)
  @Post()
  async create(@CurrentUser() user: CoreHubIdentity, @Body() dto: CreateItemDto): Promise<ItemView> {
    return this.items.create(await this.members.actorFor(user), dto);
  }

  @RequirePermissions(Permission.ITEM_UPDATE_ANY, Permission.ITEM_UPDATE_OWN)
  @Patch(':id')
  async update(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
  ): Promise<ItemView> {
    return this.items.updateStatus(await this.members.actorFor(user), id, dto.status);
  }

  @RequirePermissions(Permission.ITEM_DELETE_ANY, Permission.ITEM_DELETE_OWN)
  @Delete(':id')
  async remove(@CurrentUser() user: CoreHubIdentity, @Param('id', ParseUUIDPipe) id: string): Promise<DeletedView> {
    return this.items.remove(await this.members.actorFor(user), id);
  }
}
