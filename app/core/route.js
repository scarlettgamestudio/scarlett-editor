app.config(['$routeProvider',
	function ($routeProvider) {
		$routeProvider.when('/main', {
			templateUrl: 'pages/main/main.html'
		}).when('/login', {
			templateUrl: 'pages/login/login.html',
			cache: false
		}).when('/register', {
			templateUrl: 'pages/register/register.html'
		}).otherwise({
			redirectTo: '/login'
		});
	}]);