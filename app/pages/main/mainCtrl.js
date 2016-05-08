/**
 * Created by John on 12/12/15.
 */

app.controller('MainCtrl', ['$scope', 'logSvc', 'soapSvc', 'config', 'userSvc', '$rootScope', '$translate', '$uibModal', '$http', '$compile',
	function ($scope, logSvc, soapSvc, config, userSvc, $rootScope, $translate, $uibModal, $http, $compile) {

		var myLayout = null;
		var activeModal = null;

		$scope.openNewProjectModal = function () {
			activeModal = $uibModal.open({
				animation: true,
				templateUrl: "modals/newProject/newProjectModal.html",
				controller: "NewProjectModalCtrl",
				size: 200
			});
		};

		$scope.logout = function () {
			// call of user service logout, it will handle ui view changes as well:
			userSvc.logout();
		};

		$scope.safeDigest = function () {
			!$scope.$$phase && $scope.$digest();
		};

		// initialization
		(function init() {
			$scope.userInfo = userSvc.getUserInfo();

			myLayout = new GoldenLayout({
				settings: {
					hasHeaders: true,
					showPopoutIcon: false
				},
				labels: {
					close: $translate.instant("ACTION_CLOSE"),
					maximise: $translate.instant("ACTION_MAXIMIZE"),
					minimise: $translate.instant("ACTION_MINIMIZE"),
					popout: $translate.instant("ACTION_POPOUT")
				},
				dimensions: {
					borderWidth: 5,
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
										url: ''
									},
									title: $translate.instant("EDITOR_SCENE_HIERARCHY")
								},
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'projectExplorer',
										url: ''
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
										url: ''
									},
									title: $translate.instant("EDITOR_SCENE_VIEW")
								},
								{
									type: 'component',
									componentName: 'template',
									componentState: {
										templateId: 'consoleView',
										url: ''
									},
									height: 25,
									title: $translate.instant("EDITOR_CONSOLE")
								}
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
			});

			myLayout.registerComponent('template', function (container, state) {
				if(state.url && state.url.length > 0) {
					$http.get(state.url, {cache: true}).success(function (html) {
						html = $compile(html)($scope);
						container.getElement().html(html);

						if (state.templateId == "inspector") {
							setTimeout(function () {
								var transform = new GameObject();
								angular.element(document.getElementById('scenePropertyEditor')).scope().addTarget(transform, true);
							}, 100);

						}
					});
				}
			});

			myLayout.on('initialised', function () {
				//angular.bootstrap( document.body, [ 'scarlett' ]);
			});

			myLayout.init();
		})();
	}]
);

