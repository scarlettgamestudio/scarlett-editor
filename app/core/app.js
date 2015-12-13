// starter script
'use strict';

var dependencies = [
	'pascalprecht.translate',
	'ngRoute',
	'validation.match',
	'ui.bootstrap'
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
	}
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
});

