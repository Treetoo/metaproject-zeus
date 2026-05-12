import { ApiException } from '../../api-exception';

export class PublicationAlreadyPresentApiException extends ApiException {
	constructor(
		message = 'Publication already exists. Each publication with the same DOI/identifier can only be added once.'
	) {
		super(409, message, 409);
	}
}
