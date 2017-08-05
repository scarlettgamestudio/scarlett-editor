app.controller('ContentBrowserTreeCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', 'sceneSvc', '$translate', 'constants', 'refactorSvc', 'assetSvc',
    function ($scope, logSvc, config, scarlettSvc, sceneSvc, $translate, constants, refactorSvc, assetSvc) {

        $scope.createItemsContextMenuOptions =
            ['<i class="fa fa-plus-square"></i>' + $translate.instant("CTX_CREATE"), [
                ['<i class="fa fa-folder-o"></i>' + $translate.instant("CTX_FOLDER"), function ($itemScope) {
                    $scope.addFolder();
                }],
                null,
                ['<i class="fa fa-picture-o"></i>' + $translate.instant("CTX_GAME_SCENE"), function ($itemScope) {
                    $scope.createAsset($translate.instant("ASSET_GAME_SCENE_FILENAME"), assetSvc.createGameScene());
                }],
                ['<i class="fa fa-file-code-o"></i>' + $translate.instant("CTX_JS_SCRIPT"), function ($itemScope) {
                    $scope.createAsset($translate.instant("ASSET_JS_SCRIPT_FILENAME"), assetSvc.createJSScript());
                }],
                ['<i class="fa fa-object-group"></i>' + $translate.instant("CTX_ATLAS"), function ($itemScope) {
                    $scope.createAsset($translate.instant("ASSET_ATLAS_FILENAME"), assetSvc.createTextureAtlas());
                }],
            ]];

        $scope.addItemsContextMenuOptions =
            ['<i class="fa fa-download"></i>' + $translate.instant("CTX_ADD_FROM_FOLDER"), function ($itemScope) {

            }];

        $scope.openFolderInFileExplorer =
            ['<i class="fa fa-folder-open-o"></i>' + $translate.instant("CTX_OPEN_FOLDER_FILE_EXPLORER"), function ($itemScope) {
                NativeInterface.openFile($scope.model.selectedNode.attributes.path);
            }];

        $scope.copyPathsContextMenuOptions = [
            ['<i class="fa fa-clipboard"></i>' + $translate.instant("CTX_COPY_FULL_PATH"), function ($itemScope) {
                NativeInterface.copy($scope.model.selectedNode.attributes.path);
            }],
            ['' + $translate.instant("CTX_COPY_RELATIVE_PATH"), function ($itemScope) {
                let path = Path.makeRelative(scarlettSvc.activeProjectPath, $scope.model.selectedNode.attributes.path);
                NativeInterface.copy(path);
            }, function ($itemScope, $event, modelValue, text, $li) {
                return $scope.model.selectedNode.parent;
            }],
        ];

        $scope.extraContextMenuOptions = [
            ['<i class="fa fa-pencil-square-o"></i>' + $translate.instant("CTX_RENAME"), function ($itemScope) {
                if ($scope.model.selectedNode != null) {
                    $scope.model.selectedNode.attributes.isRenaming = true;
                }
            }, function ($itemScope, $event, modelValue, text, $li) {
                return $scope.model.selectedNode.parent;
            }],
            ['<i class="fa fa-trash"></i>' + $translate.instant("CTX_DELETE"), function ($itemScope) {
                $scope.deleteNode($scope.model.selectedNode);

            }, function ($itemScope, $event, modelValue, text, $li) {
                return $scope.model.selectedNode.parent;
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

        $scope.onTreeSelectionChanged = function (selected) {
            if (selected.length === 0) {
                $scope.setActiveFolderNode(null);
            }
        };

        $scope.onFolderSelection = function (node) {
            // store selected node
            $scope.setActiveFolderNode(node);
        };

        $scope.folderContextMenuOptions = function (node) {
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

        $scope.onTreeItemInputBlur = function (event, node) {
            node.attributes.isRenaming = false;
        };

        $scope.onTreeItemInputKeyPress = function (event, node) {
            // enter pressed?
            if (event.which === 13 && event.currentTarget.value && event.currentTarget.value.trim().length > 0) {
                let newName = event.currentTarget.value.trim();
                let oldPath = node.attributes.path;
                let split = node.attributes.path.split(Path.TRAILING_SLASH);
                split[split.length - 1] = event.currentTarget.value;
                let newPath = split.join(Path.TRAILING_SLASH);

                if (newName === node.name) {
                    // no changes required..
                    return;
                }

                if ($scope.nodeNameExists(node.parent.nodes, newName)) {
                    alert($translate.instant("WARN_PATH_ALREADY_EXISTS"));
                    return;
                }

                function callback(err) {
                    node.attributes.isRenaming = false;

                    if (!err) {
                        node.attributes.path = newPath;
                        node.name = newName;

                        // deep update all inner nodes paths stored in memory:
                        $scope.deepUpdatePath(node, Path.wrapDirectoryPath(oldPath), Path.wrapDirectoryPath(newPath));
                    }

                    node.parent.nodes = $scope.sortNodes(node.parent.nodes);

                    $scope.safeDigest();
                }

                refactorSvc.rename(oldPath, newPath, true).then(callback, callback);
            }
        };

        $scope.safeDigest = function () {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        $scope.itemContextMenuOptions = function (node) {
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

        $scope.updateProjectFileMap = function () {
            // update file map
            scarlettSvc.updateActiveProjectFileMap();

            // refresh UI with the new file map
            $scope.refresh();
        };

        (function init() {

        })();
    }

]);