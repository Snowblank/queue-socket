import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { RoomStatus } from '../type';
import { Transform } from 'class-transformer';

export class GetRoomsQueryDto {
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isSeatAvailable?: boolean;
}
