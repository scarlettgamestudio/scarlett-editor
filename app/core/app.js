// starter script
'use strict';

var dependencies = [
	'pascalprecht.translate',
	'ngRoute',
	'validation.match',
	'ui.bootstrap',
	'LocalStorageModule',
	'cz-tree',
	'ui.bootstrap.contextMenu',
	'angular-perfect-scrollbar-2'
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
	};

	// set the global root scope:
	AngularHelper.rootScope = $rootScope;
})

.constant("constants", {
	GAME_OBJECT_TYPES: {
		BASIC: "basic",
		SPRITE: "sprite"
	},
	EVENTS: {
		CONTAINER_RESIZE: "onContainerResize",
		GAME_OBJECT_ADDED: "onGameObjectAdded",
		GAME_OBJECT_REMOVED: "onGameObjectRemoved",
		PROJECT_LOADED: "onProjectLoaded",
		GAME_OBJECT_SELECTION_CHANGED: "onGameObjectSelectionChange",
		GAME_OBJECT_UPDATED: "onGameObjectUpdated",
		GAME_SCENE_CHANGED: "onGameSceneChanged",
		GAME_INITIALIZE: "onGameInitialize",

	},
	CONTAINERS: {
		SCENE_VIEW: "sceneView"
	},
	MOUSE_BUTTONS: {
		LEFT: 0,
		MIDDLE: 1,
		RIGHT: 2
	}
})

.constant("config", {
	API: {
		ADDRESS: "https://anlagehub.com/scarlett_ws/service.php",
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
	localStorageServiceProvider.setPrefix('LSBGH7X-004');
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
});
