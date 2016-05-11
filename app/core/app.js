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

.run(function ($rootScope, $location) {

	// validate if the scarlett folder exists:
	ScarlettInterface.setupApplicationFolder();

	$rootScope.changeView = function (viewName) {
		$location.path(viewName);
	};

	// system window events subscription
	NativeEmitter.subscribe("systemWindowEvent", function(type) {
		console.log(type);
	});

	window.onbeforeunload = function () {
		// clear all handlers from the native emitter has they will be invalid after page close
		NativeEmitter.clear();
	}
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
	DEFAULT_CONTENT_VIEW: 1,
	IGNORED_FILE_EXTENSIONS: [
		".sc"
	]
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
