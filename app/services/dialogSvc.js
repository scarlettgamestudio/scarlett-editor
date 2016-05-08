/**
 * Created by John
 */

app.factory("dialogSvc", function ($uibModal) {
	var svc = {};
	svc.activeModal = null;

	svc.showDialog = function(title, body, type) {
		svc.activeModal = $uibModal.open({
			animation: true,
			templateUrl: 'modals/dialog/dialogModal.html',
			controller: 'DialogModalCtrl',
			size: 'sm',
			resolve: {
				dialog: function () {
					return {
						title: title,
						body: body,
						type: type
					};
				}
			}
		});
	};

	return svc;
});
