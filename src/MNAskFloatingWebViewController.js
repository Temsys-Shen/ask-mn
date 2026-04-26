const MNAskAnimationFrameInterval = 1 / 60;
const MNAskAnimationDuration = 0.24;
const MNAskBubbleSize = 56;
const MNAskBubbleMargin = 16;
const MNAskMinimizeButtonSize = 44;
const MNAskOverlayColor = UIColor.colorWithRedGreenBlueAlpha(0.05, 0.08, 0.14, 0.92);
const MNAskBubbleColor = UIColor.colorWithRedGreenBlueAlpha(0.16, 0.49, 0.93, 1);
const MNAskMinimizeButtonColor = UIColor.colorWithRedGreenBlueAlpha(1, 1, 1, 0.18);
const MNAskBorderColor = UIColor.colorWithWhiteAlpha(1, 0.24);

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
  return Application.sharedInstance().studyController(controller.hostWindow).view;
}

function mnAskFullFrame(controller) {
  const bounds = mnAskHostView(controller).bounds;
  return { x: 0, y: 0, width: bounds.width, height: bounds.height };
}

function mnAskBubbleFrame(controller) {
  const bounds = mnAskHostView(controller).bounds;
  return {
    x: bounds.width - MNAskBubbleSize - MNAskBubbleMargin,
    y: bounds.height - MNAskBubbleSize - MNAskBubbleMargin,
    width: MNAskBubbleSize,
    height: MNAskBubbleSize,
  };
}

function mnAskApplyTransitionProgress(controller, progress) {
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

  controller.minimizeButton.frame = {
    x: nextFrame.width - MNAskMinimizeButtonSize - buttonInset,
    y: nextFrame.height - MNAskMinimizeButtonSize - buttonInset,
    width: MNAskMinimizeButtonSize,
    height: MNAskMinimizeButtonSize,
  };
  controller.minimizeButton.layer.cornerRadius = MNAskMinimizeButtonSize / 2;
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
  controller.hostWindow = window;
  mnAskHostView(controller).addSubview(controller.view);
  mnAskApplyTransitionProgress(controller, controller.animationProgress || 0);
}

function mnAskDetachFromWindow(controller) {
  mnAskStopAnimationTimer(controller);
  controller.view.removeFromSuperview();
}

function mnAskRefreshLayout(controller) {
  mnAskApplyTransitionProgress(controller, controller.animationProgress || 0);
}

function mnAskLoadBaidu(controller) {
  const url = NSURL.URLWithString("https://www.baidu.com");
  const request = NSURLRequest.requestWithURL(url);
  controller.webView.loadRequest(request);
}

var MNAskFloatingWebViewController = JSB.defineClass(
  "MNAskFloatingWebViewController : UIViewController <UIWebViewDelegate>",
  {
    viewDidLoad: function () {
      self.expanded = false;
      self.animationProgress = 0;
      self.animating = false;
      self.animationTimer = null;

      self.view.backgroundColor = UIColor.clearColor();
      self.view.layer.masksToBounds = true;
      self.view.layer.cornerRadius = MNAskBubbleSize / 2;
      self.view.layer.shadowColor = UIColor.colorWithWhiteAlpha(0, 0.28);
      self.view.layer.shadowOpacity = 1;
      self.view.layer.shadowOffset = { width: 0, height: 12 };
      self.view.layer.shadowRadius = 28;

      self.backgroundView = new UIView(self.view.bounds);
      self.backgroundView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
      self.backgroundView.backgroundColor = MNAskOverlayColor;
      self.view.addSubview(self.backgroundView);

      self.webView = new UIWebView(self.view.bounds);
      self.webView.backgroundColor = UIColor.whiteColor();
      self.webView.scalesPageToFit = true;
      self.webView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
      self.webView.delegate = self;
      self.view.addSubview(self.webView);

      self.bubbleButton = mnAskCreateButton(
        { x: 0, y: 0, width: MNAskBubbleSize, height: MNAskBubbleSize },
        "?",
        28,
        MNAskBubbleColor,
      );
      self.bubbleButton.addTargetActionForControlEvents(self, "bubbleTapped:", 1 << 6);
      self.view.addSubview(self.bubbleButton);

      self.minimizeButton = mnAskCreateButton(
        { x: 0, y: 0, width: MNAskMinimizeButtonSize, height: MNAskMinimizeButtonSize },
        "↘",
        22,
        MNAskMinimizeButtonColor,
      );
      self.minimizeButton.addTargetActionForControlEvents(self, "minimizeTapped:", 1 << 6);
      self.view.addSubview(self.minimizeButton);

      mnAskLoadBaidu(self);
      mnAskApplyTransitionProgress(self, 0);
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
      mnAskStartTransition(self, true);
    },
    minimizeTapped: function () {
      mnAskStartTransition(self, false);
    },
    webViewDidStartLoad: function () {
      console.log("[Ask MN] WebView started loading Baidu");
    },
    webViewDidFinishLoad: function () {
      console.log("[Ask MN] WebView finished loading Baidu");
    },
    webViewDidFailLoadWithError: function (webView, error) {
      console.log(
        "[Ask MN] WebView failed to load Baidu: " + error.localizedDescription,
      );
    },
    webViewShouldStartLoadWithRequestNavigationType: function () {
      return true;
    },
  },
);
