'use strict';

app.config(function ($translateProvider) {
	$translateProvider.translations('en', {
		PRODUCT_TITLE: 'Scarlett 2D',
		REMEMBER_ME: 'Remember me',
		FORGOT_PASSWORD: 'Forgot password',
		LOGIN: 'Login',
		PLACEHOLDER_LOGIN_IDENTITY: 'Your account email or username',
		PLACEHOLDER_LOGIN_PASSWORD: 'Your account password',
		PLACEHOLDER_LOGIN_CONFIRM_PASSWORD: 'Confirm your password'
	});
});