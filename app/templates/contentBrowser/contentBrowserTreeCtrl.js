app.controller('ContentBrowserTreeCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', '$translate', 'constants',
	function ($scope, logSvc, config, scarlettSvc, sceneSvc, $translate, constants) {



		$scope.createItemsContextMenuOptions =
			['<i class="fa fa-plus-square"></i>' + $translate.instant("CTX_CREATE"), [
				['<i class="fa fa-picture-o"></i>' + $translate.instant("CTX_GAME_SCENE"), function ($itemScope) {

				}],
				['<i class="fa fa-file-code-o"></i>' + $translate.instant("CTX_JS_SCRIPT"), function ($itemScope) {

				}],
				['<i class="fa fa-folder-o"></i>' + $translate.instant("CTX_FOLDER"), function ($itemScope) {

				}],
			]];

		$scope.addItemsContextMenuOptions =
			['<i class="fa fa-download"></i>' + $translate.instant("CTX_ADD_FROM_FOLDER"), function ($itemScope) {

			}];

		$scope.openFolderInFileExplorer =
			['<i class="fa fa-folder-open-o"></i>' + $translate.instant("CTX_OPEN_FOLDER_FILE_EXPLORER"), function ($itemScope) {

			}];

		$scope.copyPathsContextMenuOptions = [
			['<i class="fa fa-clipboard"></i>' + $translate.instant("CTX_COPY_FULL_PATH"), function ($itemScope) {

			}],
			['' + $translate.instant("CTX_COPY_RELATIVE_PATH"), function ($itemScope) {

			}],
		];

		$scope.extraContextMenuOptions = [
			['<i class="fa fa-pencil-square-o"></i>' + $translate.instant("CTX_RENAME"), function ($itemScope) {
				if ($scope.selectedNode != null){
					$scope.selectedNode.attributes.isRenaming = true;
				}
			}],
			['<i class="fa fa-trash"></i>' + $translate.instant("CTX_DELETE"), function ($itemScope) {

			}],
		];

		$scope.contextMenuOptions = [
			$scope.createItemsContextMenuOptions,
			$scope.addItemsContextMenuOptions,
			$scope.openFolderInFileExplorer,
			null,
			['<i class="fa fa-refresh"></i>' + $translate.instant("CTX_REFRESH"), function ($itemScope) {
				$scope.updateProjectFileMap();
			}]
		];

		$scope.onTreeSelectionChanged = function(selected) {
			if (selected.length == 0) {
				$scope.setActiveFolderNode(null);
			}
		};

		$scope.onFolderSelection = function (node) {
			// store selected node
			$scope.setActiveFolderNode(node);
		};

		$scope.folderContextMenuOptions = function(node){
			// store selected node
			$scope.setActiveFolderNode(node);

			// return context menu
			return [
				$scope.createItemsContextMenuOptions,
				$scope.addItemsContextMenuOptions,
				$scope.openFolderInFileExplorer,
				null
			].concat($scope.copyPathsContextMenuOptions, null, $scope.extraContextMenuOptions);
		};

		$scope.itemContextMenuOptions = function(node) {
			// store selected node
			$scope.setActiveFolderNode(node);

			// return context menu
			return [
				['<i class="fa fa-external-link"></i>' + $translate.instant("CTX_OPEN"), function ($itemScope) {

				}],
				['<i class="fa fa-folder-open-o"></i>' + $translate.instant("CTX_OPEN_CONTAINING_FOLDER"), function ($itemScope) {

				}],
				null,
			].concat($scope.copyPathsContextMenuOptions, null, $scope.extraContextMenuOptions);
		};

		$scope.clearSelection = function () {
			$scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, [], false);
			$scope.safeDigest();
		};

		$scope.baseContainerClick = function () {
			//$scope.clearSelection();
		};

		$scope.updateProjectFileMap = function ()
		{
			// update file map
			scarlettSvc.updateActiveProjectFileMap();

			// refresh UI with the new file map
			$scope.refresh();
		};

		// TODO: do we really need this method to receive an array?
		$scope.onTreeDoubleClick = function(selected) {

			// TODO check if selectedNode isRenaming is not true ?
			for (var i = 0; i < selected.length; i++) {

				var attr = JSON.parse(selected[i].attachment);
				var ext = Path.getFileExtension(attr.path);

				switch (ext) {
					case ".ss":
						sceneSvc.loadSceneFromFile(attr.path);
						break;

					default:
						// open the file using the system preferred software:
						NativeInterface.openFile(attr.path);
						break;
				}
			}
		};

		(function init() {

		})();
	}

]);