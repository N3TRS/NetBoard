import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateBoardSnapshotDto {
  @ApiProperty({ description: 'Paired SessionSnapshot id from net-sessions.' })
  @IsMongoId()
  @IsNotEmpty()
  sessionSnapshotId!: string;

  @ApiProperty({ description: 'Email of the user saving the snapshot.' })
  @IsEmail()
  savedByEmail!: string;

  @ApiProperty({
    description: 'Excalidraw elements array (serialized as JSON on the wire).',
    type: 'array',
    items: { type: 'object' },
  })
  @IsArray()
  elements!: unknown[];
}
