// starter script
'use strict';

var dependencies = [
	'pascalprecht.translate',
	'ngRoute',
	'validation.match',
	'ui.bootstrap',
	'LocalStorageModule',
	'ui.tree'
];

var app = angular.module('scarlett', dependencies)

.run(function ($rootScope, $location, $translate, $http, $compile) {

	// validate if the scarlett folder exists:
	ScarlettInterface.setupApplicationFolder();

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
			USER_INFO: "uinfo",
			APP_DATA: "appdata"
		}
	},
	CONTENT_VIEWS: {
		CONFIGURATION: 0,
		HOME: 1,
		PROJECTS: 2,
		PROJECT_EDIT: 3
	},
	DEFAULT_CONTENT_VIEW: 1
})

.config(function (localStorageServiceProvider) {
	// set a unique prefix for our app:
	localStorageServiceProvider.setPrefix('LSBGH7X-003');
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
});
