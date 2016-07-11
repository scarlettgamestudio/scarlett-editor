app.controller('SceneHierarchyCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', '$translate',
	function ($scope, logSvc, config, scarlettSvc, $translate) {

		var CONTEXT_ITEMS = {
			ADD_GAME_OBJECT: "Add Game Object.."
		};

		$scope.model = {
			contextMenuSelected: null,
			contextMenuItems: [
				{ name: CONTEXT_ITEMS.ADD_GAME_OBJECT }
			]
		};

		$scope.contextMenuOptions = [
			['<i class="fa fa-plus-square"></i>' + $translate.instant("CTX_MENU_ADD_GAME_OBJECT"), function ($itemScope) {

			}],
			null,
			['<i class="fa fa-paste"></i>' + $translate.instant("CTX_PASTE"), function ($itemScope) {

			}]
		];

		$scope.refresh = function () {

		};

		(function init() {


			$scope.refresh();
		})();
	}

]);