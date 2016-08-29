/**
 * Created by John
 */

app.factory("modalSvc", function ($uibModal) {
    var svc = {};
    svc.activeModal = null;

    svc.showModal = function(modalName, resolve, size) {
        // TODO: write a mechanism that closes the active modal if any open (the tricky part is to validate if it's still open)
        svc.activeModal = $uibModal.open({
            animation: true,
            templateUrl: 'modals/' + modalName + '/' + modalName + 'Modal.html',
            controller: capitalize(modalName) + 'ModalCtrl',
            size: size || 'sm'
        });
    };

    return svc;
});
