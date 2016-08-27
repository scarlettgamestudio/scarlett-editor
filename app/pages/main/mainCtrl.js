/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope', '$translate', '$uibModal', '$http', '$compile', 'scarlettSvc', 'constants', 'sceneSvc', '$timeout',
	function ($scope, logSvc, soapSvc, config, userSvc, $rootScope, $translate, $uibModal, $http, $compile, scarlettSvc, constants, sceneSvc, $timeout) {

		var myLayout = null;
		var activeModal = null;

		AngularHelper.constants = constants;

		$scope.model = {
			onlineMode: userSvc.isLoggedIn()
		};

		$scope.openNewProjectModal = function () {
			activeModal = $uibModal.open({
				animation: true,
				templateUrl: "modals/newProject/newProjectModal.html",
				controller: "NewProjectModalCtrl",
				size: 200
			});
		};

		$scope.save = function() {
			// save active scene:
			sceneSvc.saveActiveScene();

			// save project data:
			scarlettSvc.saveProject();
		};

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		$scope.safeDigest = function () {
			!$scope.$$phase && $scope.$digest();
		};

		$scope.$on("$destroy", function(){
			if(isObjectAssigned(myLayout)) {
				myLayout.destroy();
			}
		});

		// initialization
		(function init() {

			// there is an active project assigned?
			if(!isObjectAssigned(scarlettSvc.activeProject)) {
				// no ? we can't be in this view without an active project..
				$rootScope.changeView("hub");
				return;
			}

			$scope.userInfo = userSvc.getUserInfo();

			myLayout = new GoldenLayout({
				settings: {
					hasHeaders: true,
					showPopoutIcon: false,
					popoutWholeStack: true
				},
				labels: {
					close: $translate.instant("ACTION_CLOSE"),
					maximise: $translate.instant("ACTION_MAXIMIZE"),
					minimise: $translate.instant("ACTION_MINIMIZE"),
					popout: $translate.instant("ACTION_POPOUT")
				},
				dimensions: {
					borderWidth: 4,
					headerHeight: 20
				},
				content: [{
					type: 'row',
					content: [
						{
							type: 'column',
							width: 20,
							content: [
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'sceneHierarchy',
										url: 'templates/sceneHierarchy/sceneHierarchy.html'
									},
									title: $translate.instant("EDITOR_SCENE_HIERARCHY")
								},
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'projectExplorer',
										url: 'templates/projectExplorer/projectExplorer.html'
									},
									title: $translate.instant("EDITOR_PROJECT_EXPLORER")
								}
							]
						},
						{
							type: 'column',
							content: [
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'sceneView',
										url: 'templates/sceneView/sceneView.html'
									},
									title: $translate.instant("EDITOR_SCENE_VIEW"),
									resize: function() {
										console.log("resized!!");
									}
								}/*,
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'consoleView',
										url: ''
									},
									height: 25,
									title: $translate.instant("EDITOR_CONSOLE")
								}*/
							]
						}, {
							type: 'component',
							width: 20,
							componentName: 'template',
							componentState: {
								templateId: 'inspector',
								url: 'templates/propertyEditor/propertyEditor.html'
							},
							title: $translate.instant("EDITOR_INSPECTOR")
						}]
				}]
			}, "#editor-container");

			myLayout.registerComponent('template', function (container, state) {
				if(state.url && state.url.length > 0) {
					$http.get(state.url, {cache: true}).success(function (html) {
						// compile the html so we have all angular goodies:
						html = $compile(html)($scope);
						container.getElement().html(html);

						// assign events here:
						container.on("resize", function() {
							$scope.$broadcast(constants.EVENTS.CONTAINER_RESIZE, state.templateId);
						});

						if (state.templateId == "inspector") {
							// do stuff here?
						}
					});
				}
			});

			myLayout.on('initialised', function () {

			});

			$timeout(function() {
				// running this under the $timeout guarantees that the controller will be initialized only when the base
				// html is rendered, therefore having correct size calculations (important).
				myLayout.init();

				window.onresize = function() {
					// for some reason when operating under a container the layout is not refreshed automatically,
					// so we force it here :)
					myLayout.updateSize();
				}
			}, 10);

		})();
	}]
);

