const MNAskAnimationFrameInterval = 1 / 60;
const MNAskAnimationDuration = 0.24;
const MNAskPostDragTapSuppressionDuration = 0.5;
const MNAskBubbleSize = 56;
const MNAskBubbleMargin = 16;
const MNAskMinimizeButtonSize = 56;
const MNAskOverlayColor = UIColor.colorWithRedGreenBlueAlpha(0.05, 0.08, 0.14, 0.92);
const MNAskBubbleColor = UIColor.colorWithRedGreenBlueAlpha(0.16, 0.49, 0.93, 1);
const MNAskMinimizeButtonColor = MNAskBubbleColor;
const MNAskBorderColor = UIColor.colorWithWhiteAlpha(1, 0.24);
const MNAskPanStateBegan = 1;
const MNAskPanStateChanged = 2;
const MNAskPanStateEnded = 3;
const MNAskPanStateCancelled = 4;
const MNAskPanStateFailed = 5;
const MNAskDragThreshold = 4;
const MNAskDesktopSafariUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15";
const MNAskDefaultURL = "https://ima.qq.com/wiki/?shareId=ce7603cce1e6a158557e60670cbfa23bb20931a18c86c3ea4ecfe8f8afea72bd";
const MNAskSnapPositions = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function mnAskClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mnAskLerp(from, to, progress) {
  return from + (to - from) * progress;
}

function mnAskInterpolateFrame(fromFrame, toFrame, progress) {
  return {
    x: mnAskLerp(fromFrame.x, toFrame.x, progress),
    y: mnAskLerp(fromFrame.y, toFrame.y, progress),
    width: mnAskLerp(fromFrame.width, toFrame.width, progress),
    height: mnAskLerp(fromFrame.height, toFrame.height, progress),
  };
}

function mnAskDistanceSquared(fromPoint, toPoint) {
  const dx = fromPoint.x - toPoint.x;
  const dy = fromPoint.y - toPoint.y;
  return dx * dx + dy * dy;
}

function mnAskCreateButton(frame, title, titleSize, backgroundColor) {
  const button = UIButton.buttonWithType(0);
  button.frame = frame;
  button.backgroundColor = backgroundColor;
  button.setTitleForState(title, 0);
  button.setTitleColorForState(UIColor.whiteColor(), 0);
  button.layer.borderWidth = 1;
  button.layer.borderColor = MNAskBorderColor;
  button.layer.shadowColor = UIColor.colorWithWhiteAlpha(0, 0.35);
  button.layer.shadowOpacity = 1;
  button.layer.shadowOffset = { width: 0, height: 6 };
  button.layer.shadowRadius = 16;
  return button;
}

function mnAskHostView(controller) {
  if (!controller.hostWindow) {
    throw new Error("[Ask MN] hostWindow is required before attaching floating view");
  }
  return controller.hostWindow;
}

function mnAskEnsureHostFrontmost(controller) {
  const hostView = mnAskHostView(controller);
  if (controller.view.superview !== hostView) {
    hostView.addSubview(controller.view);
    return;
  }
  hostView.addSubview(controller.view);
}

function mnAskFullFrame(controller) {
  const bounds = mnAskHostView(controller).bounds;
  return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

function mnAskSnapPointFrame(controller, snapPosition) {
  const bounds = mnAskHostView(controller).bounds;
  const maxX = bounds.width - MNAskBubbleSize - MNAskBubbleMargin;
  const maxY = bounds.height - MNAskBubbleSize - MNAskBubbleMargin;
  const midX = (bounds.width - MNAskBubbleSize) / 2;
  const midY = (bounds.height - MNAskBubbleSize) / 2;

  switch (snapPosition) {
    case "top-left":
      return { x: MNAskBubbleMargin, y: MNAskBubbleMargin, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "top-center":
      return { x: midX, y: MNAskBubbleMargin, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "top-right":
      return { x: maxX, y: MNAskBubbleMargin, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "middle-left":
      return { x: MNAskBubbleMargin, y: midY, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "middle-right":
      return { x: maxX, y: midY, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "bottom-left":
      return { x: MNAskBubbleMargin, y: maxY, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "bottom-center":
      return { x: midX, y: maxY, width: MNAskBubbleSize, height: MNAskBubbleSize };
    case "bottom-right":
      return { x: maxX, y: maxY, width: MNAskBubbleSize, height: MNAskBubbleSize };
    default:
      throw new Error("[Ask MN] Unknown snap position: " + snapPosition);
  }
}

function mnAskBubbleFrame(controller) {
  if (controller.dragBubbleFrame) {
    return controller.dragBubbleFrame;
  }
  return mnAskSnapPointFrame(controller, controller.snapPosition);
}

function mnAskArrowTitleForSnapPosition(snapPosition) {
  switch (snapPosition) {
    case "top-left":
      return "↖";
    case "top-center":
      return "↑";
    case "top-right":
      return "↗";
    case "middle-left":
      return "←";
    case "middle-right":
      return "→";
    case "bottom-left":
      return "↙";
    case "bottom-center":
      return "↓";
    case "bottom-right":
      return "↘";
    default:
      throw new Error("[Ask MN] Unknown snap position for arrow: " + snapPosition);
  }
}

function mnAskMinimizeButtonFrame(expandedFrame, snapPosition, buttonInset) {
  const centerX = (expandedFrame.width - MNAskMinimizeButtonSize) / 2;
  const centerY = (expandedFrame.height - MNAskMinimizeButtonSize) / 2;
  const leftX = buttonInset;
  const rightX = expandedFrame.width - MNAskMinimizeButtonSize - buttonInset;
  const topY = buttonInset;
  const bottomY = expandedFrame.height - MNAskMinimizeButtonSize - buttonInset;

  switch (snapPosition) {
    case "top-left":
      return { x: leftX, y: topY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "top-center":
      return { x: centerX, y: topY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "top-right":
      return { x: rightX, y: topY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "middle-left":
      return { x: leftX, y: centerY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "middle-right":
      return { x: rightX, y: centerY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "bottom-left":
      return { x: leftX, y: bottomY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "bottom-center":
      return { x: centerX, y: bottomY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    case "bottom-right":
      return { x: rightX, y: bottomY, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize };
    default:
      throw new Error("[Ask MN] Unknown snap position for minimize button: " + snapPosition);
  }
}

function mnAskBubbleCenter(frame) {
  return {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
}

function mnAskClampedBubbleFrame(controller, frame) {
  const bounds = mnAskHostView(controller).bounds;
  const maxX = bounds.width - frame.width - MNAskBubbleMargin;
  const maxY = bounds.height - frame.height - MNAskBubbleMargin;
  return {
    x: mnAskClamp(frame.x, MNAskBubbleMargin, maxX),
    y: mnAskClamp(frame.y, MNAskBubbleMargin, maxY),
    width: frame.width,
    height: frame.height,
  };
}

function mnAskNearestSnapPosition(controller, frame) {
  const frameCenter = mnAskBubbleCenter(frame);
  let nearestPosition = MNAskSnapPositions[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < MNAskSnapPositions.length; index += 1) {
    const snapPosition = MNAskSnapPositions[index];
    const snapFrame = mnAskSnapPointFrame(controller, snapPosition);
    const snapCenter = mnAskBubbleCenter(snapFrame);
    const distance = mnAskDistanceSquared(frameCenter, snapCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPosition = snapPosition;
    }
  }

  return nearestPosition;
}

function mnAskUpdateSnapPosition(controller, snapPosition) {
  controller.snapPosition = snapPosition;
  controller.dragBubbleFrame = null;
}

function mnAskApplyTransitionProgress(controller, progress) {
  if (
    !controller.backgroundView
    || !controller.webView
    || !controller.bubbleButton
    || !controller.minimizeButton
  ) {
    return;
  }
  const normalizedProgress = mnAskClamp(progress, 0, 1);
  const nextFrame = mnAskInterpolateFrame(
    mnAskBubbleFrame(controller),
    mnAskFullFrame(controller),
    normalizedProgress,
  );
  const bubbleRadius = MNAskBubbleSize / 2;
  const fullRadius = 0;
  const buttonInset = 12;

  controller.animationProgress = normalizedProgress;
  controller.view.frame = nextFrame;
  controller.view.layer.cornerRadius = mnAskLerp(
    bubbleRadius,
    fullRadius,
    normalizedProgress,
  );

  controller.backgroundView.frame = {
    x: 0,
    y: 0,
    width: nextFrame.width,
    height: nextFrame.height,
  };
  controller.backgroundView.alpha = normalizedProgress;

  controller.webView.frame = {
    x: 0,
    y: 0,
    width: nextFrame.width,
    height: nextFrame.height,
  };
  controller.webView.alpha = normalizedProgress;
  controller.webView.hidden = normalizedProgress < 0.02;

  controller.bubbleButton.frame = {
    x: 0,
    y: 0,
    width: nextFrame.width,
    height: nextFrame.height,
  };
  controller.bubbleButton.layer.cornerRadius = nextFrame.height / 2;
  controller.bubbleButton.alpha = 1 - normalizedProgress;
  controller.bubbleButton.hidden = normalizedProgress > 0.98;

  controller.minimizeButton.frame = mnAskMinimizeButtonFrame(
    nextFrame,
    controller.snapPosition,
    buttonInset,
  );
  controller.minimizeButton.layer.cornerRadius = MNAskMinimizeButtonSize / 2;
  controller.minimizeButton.setTitleForState(
    mnAskArrowTitleForSnapPosition(controller.snapPosition),
    0,
  );
  controller.minimizeButton.alpha = normalizedProgress;
  controller.minimizeButton.hidden = normalizedProgress < 0.98;
}

function mnAskStopAnimationTimer(controller) {
  if (controller.animationTimer && controller.animationTimer.isValid) {
    controller.animationTimer.invalidate();
  }
  controller.animationTimer = null;
  controller.animating = false;
}

function mnAskClearPostDragTapSuppression(controller) {
  if (controller.postDragTapSuppressionTimer && controller.postDragTapSuppressionTimer.isValid) {
    controller.postDragTapSuppressionTimer.invalidate();
  }
  controller.postDragTapSuppressionTimer = null;
  controller.suppressNextBubbleTap = false;
}

function mnAskSuppressBubbleTapAfterDrag(controller) {
  mnAskClearPostDragTapSuppression(controller);
  controller.suppressNextBubbleTap = true;
  controller.postDragTapSuppressionTimer = NSTimer.scheduledTimerWithTimeInterval(
    MNAskPostDragTapSuppressionDuration,
    false,
    function (timer) {
      timer.invalidate();
      if (controller.postDragTapSuppressionTimer === timer) {
        controller.postDragTapSuppressionTimer = null;
      }
      controller.suppressNextBubbleTap = false;
    },
  );
}

function mnAskInitializeControllerState(controller) {
  if (controller.didInitializeState) {
    return;
  }
  controller.didInitializeState = true;
  controller.expanded = false;
  controller.animationProgress = 0;
  controller.animating = false;
  controller.animationTimer = null;
  controller.postDragTapSuppressionTimer = null;
  controller.snapPosition = "bottom-right";
  controller.dragStartFrame = null;
  controller.dragBubbleFrame = null;
  controller.dragMoved = false;
  controller.suppressNextBubbleTap = false;
}

function mnAskBuildViewHierarchy(controller) {
  if (controller.didBuildViewHierarchy || controller.isBuildingViewHierarchy) {
    return;
  }
  controller.isBuildingViewHierarchy = true;

  const rootView = controller.view;

  rootView.backgroundColor = UIColor.clearColor();
  rootView.layer.masksToBounds = true;
  rootView.layer.cornerRadius = MNAskBubbleSize / 2;
  rootView.layer.shadowColor = UIColor.colorWithWhiteAlpha(0, 0.28);
  rootView.layer.shadowOpacity = 1;
  rootView.layer.shadowOffset = { width: 0, height: 12 };
  rootView.layer.shadowRadius = 28;

  controller.backgroundView = new UIView(rootView.bounds);
  controller.backgroundView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
  controller.backgroundView.backgroundColor = MNAskOverlayColor;
  rootView.addSubview(controller.backgroundView);

  controller.webView = new UIWebView(rootView.bounds);
  controller.webView.backgroundColor = UIColor.whiteColor();
  controller.webView.scalesPageToFit = true;
  controller.webView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
  controller.webView.customUserAgent = MNAskDesktopSafariUserAgent;
  controller.webView.delegate = controller;
  rootView.addSubview(controller.webView);

  controller.bubbleButton = mnAskCreateButton(
    { x: 0, y: 0, width: MNAskBubbleSize, height: MNAskBubbleSize },
    "?",
    28,
    MNAskBubbleColor,
  );
  controller.bubbleButton.addTargetActionForControlEvents(controller, "bubbleTapped:", 1 << 6);
  controller.bubblePanRecognizer = new UIPanGestureRecognizer();
  controller.bubblePanRecognizer.addTargetAction(controller, "bubblePanned:");
  controller.bubblePanRecognizer.cancelsTouchesInView = false;
  controller.bubblePanRecognizer.delaysTouchesBegan = false;
  controller.bubblePanRecognizer.delaysTouchesEnded = false;
  controller.bubbleButton.addGestureRecognizer(controller.bubblePanRecognizer);
  rootView.addSubview(controller.bubbleButton);

  controller.minimizeButton = mnAskCreateButton(
    { x: 0, y: 0, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize },
    "↘",
    22,
    MNAskMinimizeButtonColor,
  );
  controller.minimizeButton.addTargetActionForControlEvents(controller, "minimizeTapped:", 1 << 6);
  rootView.addSubview(controller.minimizeButton);

  mnAskLoadDefaultPage(controller);
  controller.didBuildViewHierarchy = true;
  controller.isBuildingViewHierarchy = false;
}

function mnAskEnsureViewReady(controller) {
  mnAskInitializeControllerState(controller);
  mnAskBuildViewHierarchy(controller);
}

function mnAskFinishBubbleDrag(controller, shouldSuppressTap) {
  if (!controller.dragBubbleFrame) {
    return;
  }
  mnAskUpdateSnapPosition(
    controller,
    mnAskNearestSnapPosition(controller, controller.dragBubbleFrame),
  );
  controller.dragStartFrame = null;
  controller.dragMoved = false;
  if (shouldSuppressTap) {
    mnAskSuppressBubbleTapAfterDrag(controller);
  } else {
    mnAskClearPostDragTapSuppression(controller);
  }
  mnAskApplyTransitionProgress(controller, 0);
}

function mnAskHandleBubblePan(controller, recognizer) {
  if (controller.expanded || controller.animating) {
    return;
  }

  const state = recognizer.state;

  if (state === MNAskPanStateBegan) {
    controller.dragStartFrame = mnAskBubbleFrame(controller);
    controller.dragBubbleFrame = controller.dragStartFrame;
    controller.dragMoved = false;
    mnAskClearPostDragTapSuppression(controller);
    return;
  }

  if (state === MNAskPanStateChanged) {
    if (!controller.dragStartFrame) {
      controller.dragStartFrame = mnAskBubbleFrame(controller);
    }
    const translation = recognizer.translationInView(mnAskHostView(controller));
    const nextFrame = mnAskClampedBubbleFrame(controller, {
      x: controller.dragStartFrame.x + translation.x,
      y: controller.dragStartFrame.y + translation.y,
      width: MNAskBubbleSize,
      height: MNAskBubbleSize,
    });
    if (
      Math.abs(translation.x) > MNAskDragThreshold
      || Math.abs(translation.y) > MNAskDragThreshold
    ) {
      controller.dragMoved = true;
    }
    controller.dragBubbleFrame = nextFrame;
    mnAskApplyTransitionProgress(controller, 0);
    return;
  }

  if (
    state === MNAskPanStateEnded
    || state === MNAskPanStateCancelled
    || state === MNAskPanStateFailed
  ) {
    mnAskFinishBubbleDrag(controller, controller.dragMoved);
  }
}

function mnAskStartTransition(controller, expand) {
  if (controller.animating) {
    return;
  }
  if (expand === controller.expanded) {
    return;
  }

  controller.transitionStart = controller.animationProgress;
  controller.transitionEnd = expand ? 1 : 0;
  controller.transitionStartTime = Date.now();
  mnAskStopAnimationTimer(controller);
  controller.animating = true;

  controller.animationTimer = NSTimer.scheduledTimerWithTimeInterval(
    MNAskAnimationFrameInterval,
    true,
    function (timer) {
      const elapsed = (Date.now() - controller.transitionStartTime) / 1000;
      const ratio = mnAskClamp(elapsed / MNAskAnimationDuration, 0, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const nextProgress = mnAskLerp(
        controller.transitionStart,
        controller.transitionEnd,
        eased,
      );
      mnAskApplyTransitionProgress(controller, nextProgress);

      if (ratio >= 1) {
        timer.invalidate();
        controller.animationTimer = null;
        controller.animating = false;
        controller.expanded = expand;
        mnAskApplyTransitionProgress(controller, controller.transitionEnd);
      }
    },
  );
}

function mnAskAttachToWindow(controller, window) {
  mnAskInitializeControllerState(controller);
  controller.hostWindow = window;
  controller.view;
  mnAskEnsureHostFrontmost(controller);
  mnAskApplyTransitionProgress(controller, controller.animationProgress || 0);
}

function mnAskDetachFromWindow(controller) {
  mnAskStopAnimationTimer(controller);
  mnAskClearPostDragTapSuppression(controller);
  controller.view.removeFromSuperview();
}

function mnAskRefreshLayout(controller) {
  mnAskEnsureHostFrontmost(controller);
  if (controller.dragBubbleFrame && !controller.expanded) {
    mnAskFinishBubbleDrag(controller, false);
  }
  mnAskApplyTransitionProgress(controller, controller.animationProgress || 0);
}

function mnAskLoadDefaultPage(controller) {
  const url = NSURL.URLWithString(MNAskDefaultURL);
  const request = NSURLRequest.requestWithURL(url);
  controller.webView.loadRequest(request);
}

var MNAskFloatingWebViewController = JSB.defineClass(
  "MNAskFloatingWebViewController : UIViewController <UIWebViewDelegate>",
  {
    viewDidLoad: function () {
      mnAskEnsureViewReady(self);
      if (self.hostWindow) {
        mnAskApplyTransitionProgress(self, 0);
      }
    },
    viewWillAppear: function () {
      self.webView.delegate = self;
    },
    viewWillDisappear: function () {
      mnAskStopAnimationTimer(self);
      self.webView.stopLoading();
      self.webView.delegate = null;
    },
    bubbleTapped: function () {
      if (self.suppressNextBubbleTap) {
        mnAskClearPostDragTapSuppression(self);
        return;
      }
      mnAskStartTransition(self, true);
    },
    bubblePanned: function (recognizer) {
      mnAskHandleBubblePan(self, recognizer);
    },
    minimizeTapped: function () {
      mnAskStartTransition(self, false);
    },
    webViewDidStartLoad: function () {
      console.log("[Ask MN] WebView started loading IMA page");
    },
    webViewDidFinishLoad: function () {
      console.log("[Ask MN] WebView finished loading IMA page");
    },
    webViewDidFailLoadWithError: function (webView, error) {
      console.log(
        "[Ask MN] WebView failed to load IMA page: " + error.localizedDescription,
      );
    },
    webViewShouldStartLoadWithRequestNavigationType: function () {
      return true;
    },
  },
);
