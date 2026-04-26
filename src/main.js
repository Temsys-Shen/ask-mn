JSB.require('MNAskFloatingWebViewController');
JSB.require('MNAskMNAddon');

JSB.newAddon = function (mainPath) {
  return createMNAskMNAddon(mainPath);
};
