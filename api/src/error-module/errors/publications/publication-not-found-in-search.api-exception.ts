import { ApiException } from '../../api-exception';

export class PublicationNotFoundInSearchApiException extends ApiException {
	constructor(
		message = 'No publication found matching the provided identifier. Please verify the ID and try again.'
	) {
		super(404, message, 404);
	}
}
