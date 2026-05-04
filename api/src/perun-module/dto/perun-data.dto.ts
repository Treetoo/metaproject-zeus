import { ApiProperty } from '@nestjs/swagger';
import { Type, Expose } from 'class-transformer';
import { IsString, IsOptional, IsObject, ValidateNested, IsArray, IsNotEmpty } from 'class-validator';

export class PerunUserDto {
	@ApiProperty({ description: 'Perun internal user ID' })
	@IsString()
	@IsNotEmpty()
	userId: string;

	@ApiProperty({ description: 'Perun user name' })
	@IsString()
	@IsNotEmpty()
	userName: string;

	@ApiProperty({
		description: 'All other raw attributes returned by Perun',
		required: false,
		type: Object
	})
	@IsOptional()
	@IsObject()
	attributes?: Record<string, any>;
}

export class FacilityAttributesDto {
	@ApiProperty({
		description: 'Host name attribute',
		required: false
	})
	@IsOptional()
	@IsString()
	@Expose()
	'urn:perun:facility:attribute-def:def:hostName'?: string;

	@ApiProperty({
		description: 'Description attribute - can be multilingual',
		required: false,
		type: Object
	})
	@IsOptional()
	@IsObject()
	@Expose()
	'urn:perun:facility:attribute-def:def:desc'?: Record<string, string>;
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
		type: FacilityAttributesDto
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => FacilityAttributesDto)
	attributes?: FacilityAttributesDto;
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
		description: 'List of users returned by the generator',
		type: [PerunUserDto]
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => PerunUserDto)
	users: PerunUserDto[];
}
