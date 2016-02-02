// starter script
'use strict';

var dependencies = [
	'pascalprecht.translate',
	'ngRoute',
	'validation.match',
	'ui.bootstrap',
	'LocalStorageModule'
];

var app = angular.module('scarlett', dependencies)

.run(function ($rootScope, $location) {
	$rootScope.changeView = function (viewName) {
		$location.path(viewName);
	};
})

.constant("config", {
	API: {
		ADDRESS: "http://anlagehub.com/scarlett_ws/service.php",
		ACTIONS: {
			LOGIN: 0,
			REGISTER: 1
		},
		RESULT: {
			OK: 0
		}
	},
	LOCAL_STORAGE: {
		KEYS: {
			USER_INFO: "uinfo"
		}
	}
})

.config(function (localStorageServiceProvider) {
	// set a unique prefix for our app:
	localStorageServiceProvider.setPrefix('LSBGH7X-001');
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
});

