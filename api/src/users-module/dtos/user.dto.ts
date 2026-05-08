export class UserDto {
	/**
	 * ID of the user
	 *
	 * @example 1
	 */
	id: number;
	/**
	 * Source of user's registration. Typically name of the service like "perun", "google", "facebook" and so on...
	 *
	 * @example "perun"
	 */
	source: string;
	/**
	 * User's external ID in the source system
	 *
	 * @example 12345
	 */
	externalId: string;
	/**
	 * User's username
	 *
	 * @example "johndoe"
	 */
	username: string;

	/**
	 * User's email
	 *
	 * @example "johndoe@mail.muni.cz"
	 */
	email: string;

	/**
	 * User's locale
	 *
	 * @example 'cs'
	 */
	locale: string;

	/**
	 * User's orcids
	 *
	 * @example ['0000-0002-3237-9305']
	 */
	orcid: string[];

	/**
	 * User's full name
	 *
	 * @example "John Doe"
	 */
	name: string;

	/**
	 * User's role. Used for visual information in frontend.
	 *
	 * @example "user"
	 */
	role?: string;
}
