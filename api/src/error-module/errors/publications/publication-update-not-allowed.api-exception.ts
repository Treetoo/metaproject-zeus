import { ApiException } from '../../api-exception';

export class PublicationUpdateNotAllowedApiException extends ApiException {
	constructor(
		message = 'Cannot update an approved publication. Approved publications are locked and cannot be modified.'
	) {
		super(403, message, 403);
	}
}
