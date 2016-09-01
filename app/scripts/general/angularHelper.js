function AngularHelper() {
}

AngularHelper.rootScope = null;

AngularHelper.constants = null;

AngularHelper.refresh = function () {
    if (!AngularHelper.rootScope) {
        return;
    }

    if (!AngularHelper.rootScope.$$phase) {
        AngularHelper.rootScope.$apply();
    }
};