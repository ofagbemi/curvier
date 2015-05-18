(function(window) {
  
  /**
   * Array of CSS browser prefixes
   * @type string[]
   */
  var prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
  
  /**
   * Array of JS browser prefixes
   * @type string[]
   */
  var jsPrefixes = ['webkit', 'moz', 'ms', 'o'];
  
  /**
   * Name of the keyframe animation controlling the box
   * @type {string}
   */
  var keyframesName = 'curvier';
  
  /**
   * Main canvas where animation drawing takes place
   * @type {HTMLCanvasElement}
   */
  var canvasElem = document.getElementById('canvas');
  
  /**
   * Region where copy/paste-able code is displayed
   * @type {HTMLElement}
   */
  var codeDisplayElem = document.getElementById('code');
  
  /**
   * @param {MouseEvent} e
   * @returns {{x: number, y: number, time: number}} Coordinates and time
   * in milliseconds of the mouse event on the canvas
   */
  var getCoordObj = function(e) {
    return {
      x: e.pageX - canvasElem.offsetLeft,
      y: e.pageY - canvasElem.offsetTop,
      time: new Date().getTime()
    };
  };
  
  /**
   * @returns {CSSStyleSheet} a style sheet object containing the
   * keyframe CSS rule, or undefined if none contains it
   */
  var getKeyframesRuleSheet = function() {
    var sheets = document.styleSheets;
    for(var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      try {
        if(!sheet.cssRules) { continue; }
      } catch (e) {
        // Firefox specific. If a security error gets hit, means we
        // XSS'd a stylesheet. Just skip over it
        if(e.name === 'SecurityError') { continue; }
        else { throw e; }
      }
      
      for(var j = 0; j < sheet.cssRules.length; j++) {
        var rule = sheet.cssRules[j];
        if(rule.name === keyframesName) { return sheet; }
      }
    }
    return undefined;
  };
  
  /**
   * @param {CSSStyleSheet} sheet
   * @returns {number} the index of the curvier rule in the passed in
   * CSSStyleSheet
   */
  var getRuleIndex = function(sheet) {
    var ruleIndex = -1;
    for(var i = 0; i < sheet.cssRules.length; i++) {
      var rule = sheet.cssRules[i];
      if(rule.name === keyframesName) {
        ruleIndex = i;
        break;
      }
    }
    return ruleIndex;
  };
  
  /**
   * @param {object[]} coords
   * @returns {number} the duration, in seconds, of the animation given by the
   * passed in coordinates
   */
  var getCoordsDuration = function(coords) {
    return (coords[coords.length-1].time - coords[0].time) / 1000;
  };
  
  /**
   * Sets the duration of the running curvier animation
   * @param {number} s Duration, in seconds, to set the running animation to
   */
  var setDuration = function(s) {
    var boxElem = document.getElementById('box');
    for(var i = 0; i < jsPrefixes.length; i++) {
      var prefix = jsPrefixes[i];
      boxElem.style[prefix + 'AnimationDuration'] = s + 's';
    }
    boxElem.style.animationDuration = s + 's';
  };
  
  /**
   * Sets the code display region to show the given rule and duration
   * @param {string} rule CSS keyframes code
   * @param {number} duration Animation duration, in seconds
   */
  var setCodeDisplay = function(rule, duration) {
    var durationStr = prefixes.map(function(prefix) {
      return prefix + 'animation-duration: ' + duration + 's;';
    }).join('\n');
    codeDisplayElem.innerHTML = durationStr + '\n\n' + rule;
  };
  
  /**
   * 
   * @param {object[]} coords Array of coordinates to build keyframes from
   */
  var getKeyframes = function(coords) {
    // start by getting all the basic transforms
    var startCoord = coords[0];
    var transforms = [];
    for(var i = 0; i < coords.length; i++) {
      var percent = (i / (coords.length - 1) * 100) + '%';
      var transX = coords[i].x - startCoord.x;
      var transY = coords[i].y - startCoord.y;
      
      transforms.push({
        rule: 'transform:translate(' + transX + 'px,' + transY + 'px)',
        percent: percent
      });
    }
    
    // now attach each prefix to each of the rules and add them
    // to the list of keyframes rules
    var keyframes = prefixes.map(function(prefix) {
      var keyframeRule = '@' + prefix + 'keyframes ' + keyframesName + '{\n' +
        transforms.map(function(transform) {
          return '  ' + transform.percent + '{' + 
            prefix + transform.rule + ';}';
        }).join('\n') + '\n}';
      return keyframeRule;
    });
    
    return keyframes;
  };
  
  /**
   * The latest captured mousemove event object
   * @type {MouseEvent}
   */
  var mousemoveEvt = undefined;
  
  /**
   * List of coordinates in the animation currently being drawn. This is
   * undefined when an animation isn't being drawn
   * @type {object[]}
   */
  var coords = undefined;
  
  /**
   * Interval returned by timer that catches the mouse position when the user's
   * drawing an animation
   * @type {number}
   */
  var interval = undefined;
  
  window.addEventListener('mousemove', function(e) {
    mousemoveEvt = e;
    if(coords) { e.preventDefault(); }
  }, false);
  
  canvasElem.addEventListener('mousedown', function(e) {
    coords = [];
    coords.push(getCoordObj(e));
    interval = setInterval(function() {
      coords.push(getCoordObj(mousemoveEvt));
    }, 10);
  }, false);
  
  window.addEventListener('mouseup', function(e) {
    if(coords === undefined) { return; }
    
    var sheet = getKeyframesRuleSheet();
    var ruleIndex = getRuleIndex(sheet);
    
    // remove the old curvier rule
    sheet.deleteRule(ruleIndex);
    
    var keyframes = getKeyframes(coords);
    
    var transformCode = '';
    // loop through the different keyframe types (webkit, moz, ms, etc) and try
    // adding them to the CSS model until one works
    for(var i = 0; i < keyframes.length; i++) {
      try {
        transformCode = keyframes[i];
        sheet.insertRule(transformCode, ruleIndex);
        break;
      } catch(e) { continue; }
    }
    
    var duration = getCoordsDuration(coords);
    setDuration(duration);
    
    setCodeDisplay(keyframes.join('\n\n'), duration);
    coords = undefined;
    clearInterval(interval);
  }, false);
  
  /**
   * HTML wrapper around the app
   * @type {HTMLElement}
   */
  var containerElem = document.getElementById('container');
  
  /**
   * Sets the canvas to take up its portion of the container element
   */
  var setSizes = function() {
    var w = containerElem.clientWidth;
    var h = containerElem.clientHeight;
    canvasElem.width = w / 3;
    canvasElem.height = h;
  };
  
  setSizes();
  window.addEventListener('resize', setSizes, false);
})(window);