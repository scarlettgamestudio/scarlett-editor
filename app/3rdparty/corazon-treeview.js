// cz-tree angular definition:
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

            $scope.initialize = function () {

            };

            $scope.selectNode = function (id, attachment, keepPrevious) {
                if ($scope.$multiSelectEnabled && keepPrevious) {
                    if (!$scope.isNodeSelected(id)) {
                        $scope.$selectedNodes.push({id: id, attachment: attachment});
                    }
                } else {
                    $scope.$selectedNodes = [{id: id, attachment: attachment}];
                }

                $scope.onSelectionChange({selected: $scope.$selectedNodes});
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

            $scope.getSelectedNodeIndex = function(id) {
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
		/* quick tip: */
		/* definitions with 'this' will be accessible from the directive */

		this.scope = $scope;

		/* scope variables */

		$scope.$parentNodeScope = null;
		$scope.$treeScope = null;

		$scope.collapsed = false;
		$scope.attachment = null;

		/* scope functions */

		$scope.depth = function () {
			// is this a root node?
			return ($scope.$parentNodeScope ? $scope.$parentNodeScope.depth() + 1 : 0);
		};

		$scope.toggleCollapse = function() {
			$scope.collapsed = !$scope.collapsed;
		};

		$scope.toggleSelect = function() {
			$scope.isSelected() ? $scope.unselect() : $scope.select();
		};

		$scope.unselect = function() {
			$scope.$treeScope.unselectNode($scope.$id);
		};

		$scope.select = function(keepPrevious) {
			$scope.$treeScope.selectNode($scope.$id, $scope.attachment, keepPrevious);
		};

		$scope.isSelected = function() {
			return $scope.$treeScope.isNodeSelected($scope.$id);
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
                    onSelectionChange: '&'
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

                    // set the attachment (if any)
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
			link: function(scope, element, attributes, treeNode) {
				// add the cz-tree-nodes class to the element:
				element.addClass('cz-tree-header');

				function applyDynamicStyle () {
					var multiplier = treeNode ? treeNode.scope.depth() * settings.itemPadding + settings.baseItemPadding : 0;
					element.css({'padding-left': multiplier + "px"});
				}

				$timeout(applyDynamicStyle);

				// set the attributes for dragging:
				element.attr('draggable', 'true');
				element.attr('dragstart', '{{onDragStart(e)}}');
				element.attr('onclick', '{{onClick(e)}}');

				// event handlers:
				var nodeScope = treeNode ? treeNode.scope : scope;

				element[0].onclick = function(e) {
					// based on the shift key state we are going to keep the previous selection or not
					nodeScope.select(e.shiftKey);
					scope.$apply();
				};

				element[0].ondragstart = function(e) {
					e.dataTransfer.setData('text/plain', '');
					scope.$apply();
				};

				element[0].ondragend = function(e) {
					console.log("end" + e);
				}
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