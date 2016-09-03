app.controller('SceneHierarchyCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', '$translate', 'gameSvc', 'constants', 'sceneSvc',
    function ($scope, logSvc, config, scarlettSvc, $translate, gameSvc, constants, sceneSvc) {

        $scope.model = {
            tree: []	// visual object hierarchy tree
        };

        $scope.addGameObjectContextMenuOptions =
            ['<i class="fa fa-plus-square"></i>' + $translate.instant("CTX_ADD_GAME_OBJECT"), [
                [$translate.instant("CTX_EMPTY"), function ($itemScope) {
                    // create empty game object and add it to the scene:
                    var gameObject = gameSvc.createGameObject(null);
                    sceneSvc.addGameObjectToScene(gameObject);
                }],
                [$translate.instant("CTX_SPRITE"), function ($itemScope) {
                    var gameObject = gameSvc.createSpriteObject(null);
                    sceneSvc.addGameObjectToScene(gameObject);
                }],
            ]];

        $scope.itemContextMenuOptions = [
            $scope.addGameObjectContextMenuOptions,
            null,
            ['<i class="fa fa-cut"></i>' + $translate.instant("CTX_CUT"), function ($itemScope) {

            }],
            ['<i class="fa fa-copy"></i>' + $translate.instant("CTX_COPY"), function ($itemScope) {

            }],
            ['<i class="fa fa-paste"></i>' + $translate.instant("CTX_PASTE"), function ($itemScope) {

            }],
            null,
            ['<i class="fa fa-trash"></i>' + $translate.instant("CTX_DELETE"), function ($itemScope) {
                // order to remove from scene:
                sceneSvc.removeGameObjectsFromScene(sceneSvc.getSelectedObjects());
            }]
        ];

        $scope.contextMenuOptions = [
            $scope.addGameObjectContextMenuOptions,
            null,
            ['<i class="fa fa-paste"></i>' + $translate.instant("CTX_PASTE"), function ($itemScope) {

            }],
            null,
            ['<i class="fa fa-refresh"></i>' + $translate.instant("CTX_REFRESH"), function ($itemScope) {
                $scope.refresh();
            }]
        ];

        $scope.clearSelection = function () {
            sceneSvc.setSelectedObjects([]);
            //$scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, [], false);
            $scope.safeDigest();
        };

        $scope.baseContainerClick = function () {
            $scope.clearSelection();
        };

        $scope.removeNodes = function (uids) {
            var recursive = function (nodes, uids) {
                for (var i = nodes.length - 1; i >= 0; i--) {
                    // lets check if this UID belongs in the uids list:
                    var idx = uids.indexOf(nodes[i].gameObject.getUID());

                    // found a valid match?
                    if (idx >= 0) {
                        // remove the node from the scope model:
                        nodes.splice(i, 1);

                        // remove from the uids selection:
                        uids.splice(idx, 1);

                        // any more to look for?
                        if (uids.length == 0) {
                            return true;
                        }

                    } else {
                        // let's check on the child nodes though:
                        if (nodes[i].nodes) {
                            var end = recursive(nodes[i].nodes, uids);

                            if (end) {
                                return end;
                            }
                        }
                    }
                }
            };

            recursive($scope.model.tree, uids)
        };

        $scope.getNodeByGameObjectUID = function (uid) {
            var recursive = function (nodes, uid) {
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].gameObject.getUID() == uid) {
                        return nodes[i];
                    }

                    if (nodes[i].nodes) {
                        var found = recursive(nodes[i].nodes, uid);

                        if (found) {
                            return found;
                        }
                    }
                }
            };

            return recursive($scope.model.tree, uid);
        };

        /**
         *
         */
        $scope.$on(constants.EVENTS.GAME_OBJECT_REMOVED, (function (e, gameObject) {
            // remove visually from the tree view:
            $scope.removeNodes([gameObject.getUID()]);
            $scope.safeDigest();

        }).bind(this));

        /**
         * Game Object added to scene event bind
         */
        $scope.$on(constants.EVENTS.GAME_OBJECT_ADDED, (function (e, gameObject, parent) {
            var nodeParent = null;
            var node = generateNode(gameObject.name, gameObject.getType(), gameObject);

            if (parent != null) {
                nodeParent = $scope.getNodeByGameObjectUID(parent.getUID());
            }

            if (nodeParent) {
                nodeParent.nodes.push(node);
            } else {
                $scope.model.tree.push(node);
            }

        }).bind(this));

        $scope.$on(constants.EVENTS.GAME_SCENE_CHANGED, (function (e, scene) {
            $scope.refresh();

        }).bind(this));

        $scope.$on(constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, (function (e, selected) {
            var targetUIDs = [];
            selected.forEach(function (obj) {
                targetUIDs.push(obj.getUID());
            });

            $scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, targetUIDs, false);
            $scope.safeDigest();

        }).bind(this));

        $scope.refresh = function () {
            if (!sceneSvc.getActiveGameScene()) {
                return;
            }

            $scope.model.tree = mapTreeModel(sceneSvc.getActiveGameScene().getGameObjects());
            $scope.safeDigest();
        };

        $scope.safeDigest = function () {
            !$scope.$$phase && $scope.$digest();
        };

        $scope.onTreeSelectionChanged = function (selected) {
            // if there are selected objects, we are going to map them with the tree data:
            var selectedGameObjects = [], uid, node;

            for (var i = 0; i < selected.length; i++) {
                uid = selected[i].id;
                node = $scope.getNodeByGameObjectUID(uid);

                if (node) {
                    selectedGameObjects.push(node.gameObject);
                }
            }

            sceneSvc.setSelectedObjects(selectedGameObjects);
        };

        function mapTreeModel(gameObjects) {
            var nodes = [];

            for (var i = 0; i < gameObjects.length; i++) {
                var node = generateNode(gameObjects[i].name, gameObjects[i].getType(), gameObjects[i]);
                node.nodes = mapTreeModel(gameObjects[i].getChildren());

                nodes.push(node);
            }

            return nodes;
        }

        function generateNode(name, type, gameObject) {
            return {
                name: name,
                type: type,
                gameObject: gameObject,
                id: gameObject.getUID(),
                nodes: []
            }
        }

        (function init() {
            $scope.refresh();
        })();
    }

]);