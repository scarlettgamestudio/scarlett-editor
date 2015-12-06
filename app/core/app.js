// starter script
'use strict';

var app = angular.module('scarlett', ['pascalprecht.translate', 'ngRoute'])

.run(function () {

})

.constant("config", {
	apiAddress: "http://anlagehub.com/scarlett_ws/service.php"
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
		otherwise({
			redirectTo: '/login'
		});
	}]);