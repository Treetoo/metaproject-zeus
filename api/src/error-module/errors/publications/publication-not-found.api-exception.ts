import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../api-exception';

const CODE = 12000;
const HTTP_MESSAGE = 'Publication not found.';
const HTTP_STATUS = HttpStatus.NOT_FOUND;

export class PublicationNotFoundApiException extends ApiException {
	override code = CODE;
	override httpMessage: string;
	override httpStatus = HTTP_STATUS;

	constructor(message?: string) {
		super(CODE, message || HTTP_MESSAGE, HTTP_STATUS);
		this.httpMessage = message || HTTP_MESSAGE;
	}
}
