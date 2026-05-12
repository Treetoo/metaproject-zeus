import { ApiException } from '../../api-exception';

export class PublicationAlreadyCreditedApiException extends ApiException {
	constructor(message = 'You are already credited for this publication.') {
		super(409, message, 409);
	}
}
