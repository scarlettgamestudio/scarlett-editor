var CZC_PREFIX = "czc.";
var CZC = {
    INLINE_OFFSET: 4,
    EVENTS: {
        SELECT_NODES_BY_UID: CZC_PREFIX + "selectNodesByUID"
    },
    DROP_LOCATION: {
        INLINE_TOP: "inlineTop",
        INLINE: "inline",
        INLINE_BOTTOM: "inlineBottom"
    }
};;// cz-tree angular definition:
angular.module("cz-tree", [])

    .constant("settings", {
        baseItemPadding: 6,
        itemPadding: 18,    // px
        multiSelect: true
    });;angular.module('cz-tree')
    .controller('TreeCtrl', ['$scope', 'settings',
        function ($scope, settings) {
            /* quick tip: */
            /* definitions with 'this' will be accessible from the directive */

            this.scope = $scope;

            /* scope variables */

            $scope.$selectedNodes = [];
            $scope.$multiSelectEnabled = settings.multiSelect;

            /* scope functions */

            $scope.$on(CZC.EVENTS.SELECT_NODES_BY_UID, (function (e, targets, keepPrevious) {
                if (targets && targets.length > 0) {
                    for (var i = 0; i < targets.length; i++) {
                        $scope.selectNode(targets[i], null, i == 0 ? keepPrevious : true, true);
                    }
                } else {
                    // clear all existing selection:
                    $scope.clearNodeSelection();
                }

            }).bind(this));

            $scope.safeDigest = function () {
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            };

            $scope.initialize = function () {

            };

            $scope.selectNode = function (id, attachment, keepPrevious, preventPublishing) {
                if ($scope.$multiSelectEnabled && keepPrevious) {
                    if (!$scope.isNodeSelected(id)) {
                        $scope.$selectedNodes.push({id: id, attachment: attachment});
                    }
                } else {
                    $scope.$selectedNodes = [{id: id, attachment: attachment}];
                }

                if (!preventPublishing) {
                    $scope.onSelectionChange({selected: $scope.$selectedNodes});
                }
            };

            $scope.onDrop = function (id, attachment, inlineLocation) {
                var dropEvent = {};
                dropEvent.inlineLocation = inlineLocation;
                dropEvent.target = {
                    id: id,
                    attachment: attachment
                };
                dropEvent.source = $scope.$selectedNodes;

                $scope.onDropEvent({dropEvent: dropEvent})
            };

            $scope.unselectNode = function (node) {
                var index = $scope.getSelectedNodeIndex(node);
                if (index >= 0) {
                    $scope.$selectedNodes.splice(index, 1);
                }
            };

            $scope.clearNodeSelection = function () {
                $scope.$selectedNodes = [];
            };

            $scope.getSelectedNodeIndex = function (id) {
                for (var i = 0; i < $scope.$selectedNodes.length; i++) {
                    if ($scope.$selectedNodes[i].id == id) {
                        return i;
                    }
                }

                return -1;
            };

            $scope.isNodeSelected = function (id) {
                var index = $scope.getSelectedNodeIndex(id);
                return index >= 0;
            };
        }
    ]);;angular.module('cz-tree')
    .controller('TreeNodeCtrl', ['$scope',
        function ($scope) {

            var INLINE_OFFSET = 3;

            /* quick tip: */
            /* definitions with 'this' will be accessible from the directive */

            this.scope = $scope;

            /* scope variables */

            $scope.$parentNodeScope = null;
            $scope.$treeScope = null;

            $scope.collapsed = false;
            $scope.attachment = null;
            $scope.id = null;

            /* scope functions */

            $scope.depth = function () {
                // is this a root node?
                return ($scope.$parentNodeScope ? $scope.$parentNodeScope.depth() + 1 : 0);
            };

            $scope.toggleCollapse = function () {
                $scope.collapsed = !$scope.collapsed;
            };

            $scope.toggleSelect = function () {
                $scope.isSelected() ? $scope.unselect() : $scope.select();
            };

            $scope.unselect = function () {
                $scope.$treeScope.unselectNode($scope.id || $scope.$id);
            };

            $scope.doubleClick = function () {
                $scope.$treeScope.onDoubleClick({selected: $scope.$treeScope.$selectedNodes});
            };

            $scope.select = function (keepPrevious) {
                $scope.$treeScope.selectNode($scope.id || $scope.$id, $scope.attachment, keepPrevious);
            };

            $scope.isSelected = function () {
                return $scope.$treeScope.isNodeSelected($scope.id || $scope.$id);
            };

            $scope.onDrop = function (e) {
                var dropLocation = CZC.DROP_LOCATION.INLINE;
                if (e.offsetY <= CZC.INLINE_OFFSET) {
                    dropLocation = CZC.DROP_LOCATION.INLINE_TOP;
                } else if (e.offsetY >= e.target.offsetHeight - CZC.INLINE_OFFSET) {
                    dropLocation = CZC.DROP_LOCATION.INLINE_BOTTOM;
                }

                $scope.$treeScope.onDrop($scope.id || $scope.$id, $scope.attachment, dropLocation);
            };

            /* initialize */

            $scope.initialize = function (parentTreeNodeCtrl, treeCtrl) {
                $scope.$parentNodeScope = parentTreeNodeCtrl ? parentTreeNodeCtrl.scope : null;
                $scope.$treeScope = treeCtrl ? treeCtrl.scope : null;
            };
        }
    ]);;angular.module('cz-tree')
    .directive('czTree', [
        function () {
            return {
                restrict: 'AE',
                controller: 'TreeCtrl',
                scope: {
                    onSelectionChange: '&',
                    onDropEvent: '&',
                    onDoubleClick: '&'
                },
                link: function (scope, element, attributes) {
                    // add the cz-tree class to the element:
                    element.addClass('cz-tree');

                    // initialize the controller:
                    scope.initialize();
                }
            }
        }
    ]);;angular.module('cz-tree')
    .directive('czTreeNode', [
        function () {
            return {
                require: ['?^^czTreeNode', '^^czTree'],
                restrict: 'AE',
                scope: true,
                controller: 'TreeNodeCtrl',
                replace: true,
                link: function (scope, element, attributes, controllers) {
                    // initialize the controller:
                    scope.initialize(controllers[0], controllers[1]);

                    // set the attachments (if any)
                    scope.id = attributes["uid"];
                    scope.attachment = attributes["attachment"];

                    // add the cz-tree-node class to the element:
                    element.addClass('cz-tree-node');
                }
            }
        }
    ]);;angular.module('cz-tree')
    .directive('czTreeNodeHeader', ['$timeout', 'settings',
        function ($timeout, settings) {
            return {
                require: '^czTreeNode',
                restrict: 'A',
                scope: true,
                replace: false,
                link: function (scope, element, attributes, treeNode) {
                    // add the cz-tree-nodes class to the element:
                    element.addClass('cz-tree-header');

                    function applyDynamicStyle() {
                        var multiplier = treeNode ? treeNode.scope.depth() * settings.itemPadding + settings.baseItemPadding : 0;
                        element.css({'padding-left': multiplier + "px"});
                    }

                    $timeout(applyDynamicStyle);

                    // set the attributes for dragging:
                    element.attr('draggable', 'true');

                    // event handlers:
                    var nodeScope = treeNode ? treeNode.scope : scope;

                    element[0].ondblclick = function (e) {
                        // based on the shift key state we are going to keep the previous selection or not
                        nodeScope.select(e.ctrlKey);
                        nodeScope.doubleClick();
                        scope.$apply();
                    };

                    element[0].onclick = function (e) {
                        // based on the shift key state we are going to keep the previous selection or not
                        nodeScope.select(e.ctrlKey);
                        scope.$apply();

                        // stop the event propagation.
                        e.stopPropagation();
                    };

                    element[0].ondragstart = function (e) {
                        if (!nodeScope.isSelected()) {
                            nodeScope.select(e.ctrlKey);
                        }

                        e.dataTransfer.setData('text/plain', '');
                        scope.$apply();
                    };

                    element[0].ondrop = function (e) {
                        nodeScope.onDrop(e);
                    };

                    element[0].ondragover = function (e) {
                        event.preventDefault();
                    };
                }
            }
        }
    ]);;angular.module('cz-tree')
    .directive('czTreeNodes', [
        function () {
            return {
                restrict: 'A',
                scope: false,
                link: function(scope, element) {
                    // add the cz-tree-nodes class to the element:
                    element.addClass('cz-tree-nodes');
                }
            }
        }
    ]);