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
	'angular-perfect-scrollbar-2',
	'colorpicker.module'
];

var app = angular.module('scarlett', dependencies)

.run(function ($rootScope, $location, constants, $route) {
	// validate if the scarlett folder exists:
	ScarlettInterface.setupApplicationFolder();

	$rootScope.safeApply = function () {
		!$rootScope.$$phase && $rootScope.$apply();
	};

	$rootScope.changeView = function (viewName) {
		var reload = false;
		// same path? if so tag for reload..
		if ("/" + viewName == $location.path()) {
			reload = true;
		}

		$location.path(viewName);

		if (reload) {
			$route.reload();
		}
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

	// assign the global constant
	AngularHelper.constants = constants;
})

.constant("constants", {
	GAME_OBJECT_TYPES: {
		BASIC: "basic",
		SPRITE: "sprite"
	},
	WINDOW_TYPES: {
		SCENE_HIERARCHY: "sceneHierarchy",
		INSPECTOR: "inspector",
		CONSOLE: "console",
		SCENE_VIEW: "sceneView",
		PROJECT_EXPLORER: "projectExplorer",
		GAME_VIEW: "gameView"
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
		MODEL_UPDATED: "onModelUpdated",
		COMMAND_HISTORY_CHANGED: "onCommandHistoryChanged",
		VIEW_CHANGED: "onViewChanged",
		ACTIVE_FOLDER_NODE_CHANGED: "onActiveFolderNodeChanged",
		ASSET_SELECTION: "onAssetSelection"
	},
	CONTAINERS: {
		SCENE_VIEW: "sceneView"
	},
	MOUSE_BUTTONS: {
		LEFT: 0,
		MIDDLE: 1,
		RIGHT: 2
	},
	CONTENT_TYPES: {
		TEXTURE_ATLAS: "texture_atlas",
		TEXTURE: "texture",
		SCRIPT: "script"
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
	localStorageServiceProvider.setPrefix('LSBGH7X-005');
})

.config(function ($translateProvider) {
	// default language
	$translateProvider.preferredLanguage('en');
	$translateProvider.useSanitizeValueStrategy('escape');
});


