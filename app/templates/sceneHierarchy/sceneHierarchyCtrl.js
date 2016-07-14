app.controller('SceneHierarchyCtrl', ['$scope', 'logSvc', 'config', 'scarlettSvc', '$translate', 'gameSvc', 'constants', 'sceneSvc',
    function ($scope, logSvc, config, scarlettSvc, $translate, gameSvc, constants, sceneSvc) {

        $scope.model = {
            tree: []	// visual object hierarchy tree
        };

        $scope.contextMenuOptions = [
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
            ]],
            null,
            ['<i class="fa fa-paste"></i>' + $translate.instant("CTX_PASTE"), function ($itemScope) {

            }],
            null,
            [$translate.instant("CTX_REFRESH"), function ($itemScope) {
                $scope.refresh();
            }]
        ];

        $scope.getGameObjectByUID = function (uid) {
            var recursive = function (uid, nodes) {
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].getUID() === uid) {
                        return nodes[i];
                    }

                    if (nodes[i].nodes) {
                        var found = recursive(uid, nodes[i].nodes);

                        if (found) {
                            return found;
                        }
                    }
                }
            };

            return recursive($scope.model.tree, uid);
        };

        /**
         * Game Object added to scene event bind
         */
        $scope.$on(constants.EVENTS.GAME_OBJECT_ADDED, (function (e, gameObject, parent) {
            var nodeParent = null;
            var node = generateNode(gameObject.name, gameObject.getType(), gameObject);

            if (parent != null) {
                nodeParent = $scope.getGameObjectByUID(parent.getUID());
            }

            if (nodeParent) {
                parent.nodes.push(node);
            } else {
                $scope.model.tree.push(node);
            }

        }).bind(this));

        $scope.refresh = function () {
            if(!sceneSvc.getActiveGameScene()) {
                return;
            }

            $scope.model.tree = mapTreeModel(sceneSvc.getActiveGameScene().getGameObjects());
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
                nodes: []
            }
        }

        (function init() {


            $scope.refresh();
        })();
    }

]);