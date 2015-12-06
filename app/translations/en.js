'use strict';

app.config(function ($translateProvider) {
	$translateProvider.translations('en', {
		PRODUCT_TITLE: 'Scarlett',
		GAME_STUDIO: 'Game Studio',
		REMEMBER_ME: 'Remember me',
		CREATE_NEW_ACCOUNT: 'Create new Account',
		FORGOT_PASSWORD: 'Forgot your password?',
		LOGIN: 'Login',
		REGISTER: 'Register',
		RETURN_LOGIN: 'Return to Login',
		PLACEHOLDER_LOGIN_IDENTITY: 'Your email or username',
		PLACEHOLDER_LOGIN_EMAIL: 'Your email address',
		PLACEHOLDER_LOGIN_USERNAME: 'Your username',
		PLACEHOLDER_LOGIN_PASSWORD: 'Your password',
		PLACEHOLDER_LOGIN_CONFIRM_PASSWORD: 'Confirm your password'
	});
});