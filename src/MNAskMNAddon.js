function createMNAskMNAddon(mainPath) {
  return JSB.defineClass(
    "MNAskMNAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        self.floatingWebViewController = MNAskFloatingWebViewController.new();
        mnAskAttachToWindow(self.floatingWebViewController, self.window);
        console.log("[Ask MN] floating WebView attached");
      },
      sceneDidDisconnect: function () {
        if (self.floatingWebViewController) {
          mnAskDetachFromWindow(self.floatingWebViewController);
          self.floatingWebViewController = null;
        }
        console.log("[Ask MN] disconnected");
      },
      controllerWillLayoutSubviews: function (controller) {
        const studyController = Application.sharedInstance().studyController(self.window);
        if (controller === studyController && self.floatingWebViewController) {
          mnAskRefreshLayout(self.floatingWebViewController);
        }
      },
    },
  );
}
