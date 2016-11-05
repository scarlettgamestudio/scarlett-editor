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
            //$scope.clearSelection();
        };

        $scope.removeNodes = function (uids) {
            var removed = [];

            var recursive = function (nodes, uids) {
                for (var i = nodes.length - 1; i >= 0; i--) {
                    // lets check if this UID belongs in the uids list:
                    var idx = uids.indexOf(nodes[i].gameObject.getUID());

                    // found a valid match?
                    if (idx >= 0) {
                        // remove the node from the scope model:
                        removed.push(nodes.splice(i, 1)[0]);

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

            recursive($scope.model.tree, uids);

            return removed;
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

        $scope.onGameObjectSelectionChanged = function (selected) {
            var targetUIDs = [];
            selected.forEach(function (obj) {
                targetUIDs.push(obj.getUID());
            });

            $scope.$broadcast(CZC.EVENTS.SELECT_NODES_BY_UID, targetUIDs, false);
            $scope.safeDigest();
        };

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

        /**
         * Event occurs when there is a node drag&drop in the treeview
         * @param dropEvent
         */
        $scope.onTreeItemDrop = function (dropEvent) {
            var target = dropEvent.target, i, removedNodes;
            var dragged = dropEvent.source, toRemove = [];
            var inlineLocation = dropEvent.inlineLocation, index;
            var targetNode = $scope.getNodeByGameObjectUID(target.id), targetNodeParent;

            // validation #1 - target node exists?
            if (!targetNode) {
                return;
            }

            // first we gather all the game object uids to remove from the tree model:
            for (i = 0; i < dragged.length; ++i) {
                // validation #2 - one of the sources is a target too? if so discard..
                if (dragged[i].id == target.id) {
                    return;
                }

                // validation #3 - trying to move to a child node? YOU CANNOT
                // TODO: check if this can be optimized
                var draggedNode = $scope.getNodeByGameObjectUID(dragged[i].id);
                if (draggedNode && draggedNode.gameObject.isChild(targetNode.gameObject)) {
                    return;
                }

                toRemove.push(dragged[i].id);
            }
            // and then we proceed to remove them
            removedNodes = $scope.removeNodes(toRemove);

            // now we need to attach the nodes to their new target:
            for (i = 0; i < removedNodes.length; ++i) {
                // update the tree model and scene hierarchy model as well:
                switch (inlineLocation) {
                    case CZC.DROP_LOCATION.INLINE:
                        // no trickery here, simply add to the target child nodes:
                        setParentNode(targetNode, removedNodes[i]);
                        removedNodes[i].gameObject.setParent(targetNode.gameObject);
                        break;

                    case CZC.DROP_LOCATION.INLINE_BOTTOM:
                    case CZC.DROP_LOCATION.INLINE_TOP:
                        targetNodeParent = targetNode.parentNode;

                        index = targetNodeParent ?
                            targetNodeParent.nodes.indexOfObject(targetNode) : $scope.model.tree.indexOfObject(targetNode);

                        if (inlineLocation == CZC.DROP_LOCATION.INLINE_BOTTOM) {
                            index++;
                        }

                        if (targetNodeParent) {
                            targetNodeParent.nodes.insert(index, removedNodes[i]);
                            targetNodeParent.gameObject.addChild(removedNodes[i].gameObject, index);
                            removedNodes[i].parent = targetNodeParent;
                        } else {
                            $scope.model.tree.insert(index, removedNodes[i]);
                            GameManager.activeScene.addGameObject(removedNodes[i].gameObject, index);
                            removedNodes[i].parent = null;
                        }

                        break;
                }
            }

            $scope.safeDigest();
        };

        /**
         * Event occurs when there is a selection change in the tree view
         * @param selected
         */
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

        function setParentNode(parent, child) {
            parent.nodes.push(child);
            child.parentNode = parent;
        }

        function mapTreeModel(gameObjects, parentNode) {
            var nodes = [];

            for (var i = 0; i < gameObjects.length; i++) {
                var node = generateNode(gameObjects[i].name, gameObjects[i].getType(), gameObjects[i], parentNode);
                node.nodes = mapTreeModel(gameObjects[i].getChildren(), node);

                nodes.push(node);
            }

            return nodes;
        }

        function generateNode(name, type, gameObject, parentNode) {
            return {
                name: name,
                type: type,
                gameObject: gameObject,
                id: gameObject.getUID(),
                nodes: [],
                parentNode: parentNode,
                equals: function (other) {
                    return this.id === other.id;
                }
            }
        }

        (function init() {
            $scope.refresh();

            // event subscription:
            EventManager.subscribe(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, $scope.onGameObjectSelectionChanged, this);
        })();

        $scope.$on("$destroy", (function () {
            EventManager.removeSubscription(AngularHelper.constants.EVENTS.GAME_OBJECT_SELECTION_CHANGED, $scope.onGameObjectSelectionChanged);

        }).bind(this));
    }

]);