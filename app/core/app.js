// starter script
'use strict';

var app = angular.module('scarlett', ['pascalprecht.translate', 'ngRoute'])

.run(function ($rootScope, $location) {
	$rootScope.changeView = function (viewName) {
		$location.path(viewName);
	};
})

.constant("config", {
	apiAddress: "http://anlagehub.com/scarlett_ws/service.php"
})

.constant("api", {
	ACTIONS: {
		LOGIN: 0,
		REGISTER: 1
	}
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
})

.config(['$routeProvider',
	function ($routeProvider) {
		$routeProvider.
		when('/login', {
			templateUrl: 'pages/login/login.html'
		}).
		when('/register', {
			templateUrl: 'pages/register/register.html'
		}).
		otherwise({
			redirectTo: '/login'
		});
	}]);