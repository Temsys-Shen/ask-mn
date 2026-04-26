function createMNAskMNAddon(mainPath) {
  return JSB.defineClass(
    "MNAskMNAddon : JSExtension",
    {
      sceneWillConnect: function () {
        self.mainPath = mainPath;
        console.log("[Ask MN] initialized");
      },
      sceneDidDisconnect: function () {
        console.log("[Ask MN] disconnected");
      },
      queryAddonCommandStatus: function () {
        return {
          image: "icon.png",
          object: self,
          selector: "sayHello:",
          checked: false,
        };
      },
      sayHello: function () {
        console.log("[Ask MN] Hello, MarginNote!");
      },
    },
  );
}
