import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../api-exception';

const CODE = 12002;
const HTTP_MESSAGE = 'Insufficient identifier information. Cannot determine publication type.';
const HTTP_STATUS = HttpStatus.BAD_REQUEST;

export class PublicationInsufficientIdentifierException extends ApiException {
	override code = CODE;
	override httpMessage = HTTP_MESSAGE;
	override httpStatus = HTTP_STATUS;

	constructor() {
		super(CODE, HTTP_MESSAGE, HTTP_STATUS);
	}
}
