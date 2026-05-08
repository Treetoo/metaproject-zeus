import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsObject, ValidateNested, IsArray, IsNotEmpty } from 'class-validator';

export class PerunUserAttributesDto {
	@ApiProperty({
		description: 'All Perun user attributes',
		required: true,
		type: Object
	})
	@IsOptional()
	@IsObject()
	attributes?: Record<string, any>;
}

export class PerunUserDto {
	@ApiProperty({
		description: 'Perun user attributes',
		required: true,
		type: PerunUserAttributesDto
	})
	@ValidateNested()
	@Type(() => PerunUserAttributesDto)
	attributes: PerunUserAttributesDto;
}

export class FacilityDto {
	@ApiProperty({ description: 'Human readable name of the facility' })
	@IsString()
	@IsNotEmpty()
	facilityName: string;

	@ApiProperty({ description: 'UUID of the facility' })
	@IsString()
	@IsNotEmpty()
	facilityUuid: string;

	@ApiProperty({
		description: 'List of destination identifiers configured for the facility',
		type: [String]
	})
	@IsArray()
	@IsString({ each: true })
	destinations: string[];

	@ApiProperty({
		description: 'All custom facility attributes',
		required: false,
		type: Object
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => Object)
	attributes?: object;
}

export class MetadataDto {
	@ApiProperty({ description: 'Version of the generator script' })
	@IsString()
	@IsNotEmpty()
	version: string;

	@ApiProperty({ description: 'Facility information' })
	@ValidateNested()
	@Type(() => FacilityDto)
	facility: FacilityDto;
}

export class PerunDataDto {
	@ApiProperty({ description: 'Metadata block' })
	@ValidateNested()
	@Type(() => MetadataDto)
	metadata: MetadataDto;

	@ApiProperty({
		description: 'Map of users returned by the generator, keyed by user ID',
		type: PerunUserDto
	})
	@IsObject()
	users: Record<string, PerunUserDto>;
}
