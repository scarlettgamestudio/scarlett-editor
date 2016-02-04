'use strict';

app.config(function ($translateProvider) {
	$translateProvider.translations('en', {
		PRODUCT_TITLE: 'Scarlett',
		PRODUCT_ABBR: 'SC',
		GAME_STUDIO: 'Game Studio',
		REMEMBER_ME: 'Remember me',
		CREATE_NEW_ACCOUNT: 'Create new Account',
		FORGOT_PASSWORD: 'Forgot your password?',
		LOGIN: 'Login',
		ERROR: 'Error',
		REGISTER: 'Register',
		RETURN_LOGIN: 'Return to Login',
		PROFILE: 'Profile',
		LOGOUT: 'Logout',
		PLACEHOLDER_LOGIN_IDENTITY: 'Your email or username',
		PLACEHOLDER_LOGIN_EMAIL: 'Your email address',
		PLACEHOLDER_LOGIN_USERNAME: 'Your username',
		PLACEHOLDER_LOGIN_PASSWORD: 'Your password',
		PLACEHOLDER_LOGIN_CONFIRM_PASSWORD: 'Confirm your password',
		REQUIRED_FIELD: 'This field is required',
		PASSWORDS_DONT_MATCH: 'Passwords don\'t match',
		INVALID_CREDENTIALS: 'Could not login, invalid credentials',
		SETTINGS: 'Settings',


		TOOLBAR_TOOLTIP_HUB: 'Hub',
		TOOLBAR_TOOLTIP_PROJECTS: 'Projects'
	});
});