
; /* Start:"a:4:{s:4:"full";s:71:"/local/components/bitrix/catalog.smart.filter/script.js?165874913430928";s:6:"source";s:55:"/local/components/bitrix/catalog.smart.filter/script.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
function JCSmartFilter(ajaxURL, viewMode, params) {
  this.ajaxURL = ajaxURL;
  this.form = null;
  this.timer = null;
  this.cacheKey = '';
  this.cache = [];
  this.popups = [];
  this.viewMode = viewMode;
  if (params && params.SEF_SET_FILTER_URL) {
    this.bindUrlToButton('set_filter', params.SEF_SET_FILTER_URL);
    this.sef = true;
  }
  if (params && params.SEF_DEL_FILTER_URL) {
    this.bindUrlToButton('del_filter', params.SEF_DEL_FILTER_URL);
  }
}

JCSmartFilter.prototype.keyup = function (input) {
  if (!!this.timer) {
    clearTimeout(this.timer);
  }
  this.timer = setTimeout(BX.delegate(function () {
    this.reload(input);
  }, this), 500);
};

JCSmartFilter.prototype.click = function (checkbox, callback) {

  if (!!this.timer) {
    clearTimeout(this.timer);
  }

  this.timer = setTimeout(BX.delegate(function () {
    this.reload(checkbox, callback);
  }, this), 500);
};

class FilterState {
  constructor() {
    this.params = {};
    this.items = [];
    this.savedStateAction = [];
  }

  addItems(item) {
    this.items.push({
      index: this.items.length,
      item: item,
      opened: false,
    });
    return this.items.length - 1
  }

  refreshItemOpenedState(state, index) {
    this.items[index].opened = state
  }

  saveStateAction() {
    let result = [];
    const itemLength = this.items.length;
    let itemIndex = 0;
    for (itemIndex; itemIndex < itemLength; itemIndex++) {
      const eachItem = this.items[itemIndex];
      result[itemIndex] = {
        action: eachItem.opened ? () => eachItem.item.open() : () => eachItem.item.close()
      };
    }
    this.savedStateAction = result
  }
}

JCSmartFilter.prototype.customStateFilter = new FilterState();
JCSmartFilter.prototype.reload = function (input, callback) {
  this.customStateFilter.saveStateAction();

  if (this.cacheKey !== '') {
    //Postprone backend query
    if (!!this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(BX.delegate(function () {
      this.reload(input);
    }, this), 1000);
    return;
  }
  this.cacheKey = '|';

  this.position = BX.pos(input, true);
  this.form = BX.findParent(input, { 'tag': 'form' });
  if (this.form) {
    var values = [];
    values.push({ name: 'ajax', value: 'y' });
    values.push({ name: 'dont_init_events', value: 'y' });
    this.gatherInputsValues(values,
      BX.findChildren(this.form, { 'tag': new RegExp('^(input|select)$', 'i') }, true));

    for (var i = 0; i < values.length; i++)
      this.cacheKey += values[i].name + ':' + values[i].value + '|';

    if (this.cache[this.cacheKey]) {
      this.curFilterinput = input;
      this.postHandler(this.cache[this.cacheKey], true);
    } else {
      if (this.sef) {
        var set_filter = BX('set_filter');
        set_filter.disabled = true;
      }
      this.curFilterinput = input;

      BX.ajax.loadJSON(
        this.ajaxURL,
        this.values2post(values),
        BX.delegate(this.postHandler, this)
      );
    }
  }
};

JCSmartFilter.prototype.updateItem = function (PID, arItem) {
  if (arItem.PROPERTY_TYPE === 'N' || arItem.PRICE) {
    var trackBar = window['trackBar' + PID];
    if (!trackBar && arItem.ENCODED_ID)
      trackBar = window['trackBar' + arItem.ENCODED_ID];

    if (trackBar && arItem.VALUES) {
      if (arItem.VALUES.MIN) {
        if (arItem.VALUES.MIN.FILTERED_VALUE)
          trackBar.setMinFilteredValue(arItem.VALUES.MIN.FILTERED_VALUE);
        else
          trackBar.setMinFilteredValue(arItem.VALUES.MIN.VALUE);
      }

      if (arItem.VALUES.MAX) {
        if (arItem.VALUES.MAX.FILTERED_VALUE)
          trackBar.setMaxFilteredValue(arItem.VALUES.MAX.FILTERED_VALUE);
        else
          trackBar.setMaxFilteredValue(arItem.VALUES.MAX.VALUE);
      }
    }
  } else if (arItem.VALUES) {
    for (var i in arItem.VALUES) {
      if (arItem.VALUES.hasOwnProperty(i)) {
        var value = arItem.VALUES[i];
        var control = BX(value.CONTROL_ID);

        if (!!control) {
          var label = document.querySelector('[data-role="label_' + value.CONTROL_ID + '"]');
          if (value.DISABLED) {
            if (arItem.CODE !== 'DATE_START')
              BX.adjust(control, { props: { disabled: true } });

            if (label)
              BX.addClass(label, 'disabled');
            else
              BX.addClass(control.parentNode, 'disabled');
          } else {
            BX.adjust(control, { props: { disabled: false } });
            if (label)
              BX.removeClass(label, 'disabled');
            else
              BX.removeClass(control.parentNode, 'disabled');
          }

          if (value.hasOwnProperty('ELEMENT_COUNT')) {
            label = document.querySelector('[data-role="count_' + value.CONTROL_ID + '"]');
            if (label)
              label.innerHTML = value.ELEMENT_COUNT;
          }
        }
      }
    }
  }
    var yearNavigation = [];

    if (arItem.CODE == 'NAVIGATION_YEAR') {
        for (let navYear in arItem.VALUES) {
            if (arItem.VALUES[navYear].CHECKED) {
                yearNavigation.push(navYear);
            }
        }
        updateStartDateAfterChangeNavYear(yearNavigation);
    }

};

JCSmartFilter.prototype.postHandler = function (result, fromCache) {

  var hrefFILTER, url, curProp;
  var modef = BX('modef');
  var modef_num = BX('modef_num');
  var count_filter = BX('count_filter');

  if (!!result && !!result.ITEMS) {
    for (var popupId in this.popups) {
      if (this.popups.hasOwnProperty(popupId)) {
        this.popups[popupId].destroy();
      }
    }
    this.popups = [];

    for (var PID in result.ITEMS) {
      if (result.ITEMS.hasOwnProperty(PID)) {
        this.updateItem(PID, result.ITEMS[PID]);
      }
    }

    if (!!modef && !!modef_num) {
      modef_num.innerHTML = '(' + result.ELEMENT_COUNT + ')';
      hrefFILTER = BX.findChildren(modef, { tag: 'A' }, true);

      if (result.FILTER_URL && hrefFILTER) {
        hrefFILTER[0].href = BX.util.htmlspecialcharsback(result.FILTER_URL);
      }

      if (result.FILTER_AJAX_URL && result.COMPONENT_CONTAINER_ID) {
        BX.unbindAll(hrefFILTER[0]);
        BX.bind(hrefFILTER[0], 'click', function (e) {
          url = BX.util.htmlspecialcharsback(result.FILTER_AJAX_URL);
          BX.ajax.insertToNode(url, result.COMPONENT_CONTAINER_ID);
          return BX.PreventDefault(e);
        });
      }

      if (result.INSTANT_RELOAD && result.COMPONENT_CONTAINER_ID) {
        url = BX.util.htmlspecialcharsback(result.FILTER_AJAX_URL);
        BX.ajax.insertToNode(url, result.COMPONENT_CONTAINER_ID);
      } else {
        if (modef.style.display === 'none') {
          modef.style.display = 'inline-block';
        }

        if (this.viewMode === "VERTICAL") {
          curProp = BX.findChild(BX.findParent(this.curFilterinput,
            { 'class': 'smart-filter-parameters-box' }),
            { 'class': 'smart-filter-container-modef' },
            true,
            false);
          curProp.appendChild(modef);
        }

        if (result.SEF_SET_FILTER_URL) {
          this.bindUrlToButton('set_filter', result.SEF_SET_FILTER_URL);
        }
      }
    }
  }

  if (this.sef) {
    var set_filter = BX('set_filter');
    set_filter.disabled = false;
  }

  if ( !!count_filter ) {
    count_filter.innerHTML = '&nbsp;(' + result.ELEMENT_COUNT + ')';
  }

  if (!fromCache && this.cacheKey !== '') {
    this.cache[this.cacheKey] = result;
  }
  this.cacheKey = '';

  var eventSelectTrigger = new Event(`selectTrigger`);
  document.dispatchEvent(eventSelectTrigger);
  var savedStateActionLength = this.customStateFilter.savedStateAction.length;
  var savedStateActionIndex = 0;
  for (savedStateActionLength; savedStateActionIndex < savedStateActionLength; savedStateActionIndex++) {
    this.customStateFilter.savedStateAction[savedStateActionIndex].action()
  }

  if(typeof App === 'object' &&
      typeof App.select === 'object' &&
      typeof App.select.run === 'function') {
    App.select.run();
  }
};

JCSmartFilter.prototype.bindUrlToButton = function (buttonId, url) {
  var button = BX(buttonId);
  if (button) {
    var proxy = function (j, func) {
      return function () {
        return func(j);
      }
    };

    if (button.type == 'submit')
      button.type = 'button';

    BX.bind(button, 'click', proxy(url, function (url) {
      window.location.href = url + '#cruises';
      return false;
    }));
  }
};

JCSmartFilter.prototype.gatherInputsValues = function (values, elements) {
  if (elements) {
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.type || !el.value)
        continue;

      switch (el.type.toLowerCase()) {
        case 'text':
        case 'textarea':
        case 'password':
        case 'hidden':
        case 'select-one':
          if (el.value.length)
            values[values.length] = { name: el.name, value: el.value };
          break;
        case 'radio':
        case 'checkbox':
          if (el.checked)
            values[values.length] = { name: el.name, value: el.value };
          break;
        case 'select-multiple':
          for (var j = 0; j < el.options.length; j++) {
            if (el.options[j].selected)
              values[values.length] = { name: el.name, value: el.options[j].value };
          }
          break;
        default:
          break;
      }
    }
  }
};

JCSmartFilter.prototype.values2post = function (values) {
  var post = [];
  var current = post;
  var i = 0;

  while (i < values.length) {
    var p = values[i].name.indexOf('[');
    if (p == -1) {
      current[values[i].name] = values[i].value;
      current = post;
      i++;
    } else {
      var name = values[i].name.substring(0, p);
      var rest = values[i].name.substring(p + 1);
      if (!current[name])
        current[name] = [];

      var pp = rest.indexOf(']');
      if (pp == -1) {
        //Error - not balanced brackets
        current = post;
        i++;
      } else if (pp == 0) {
        //No index specified - so take the next integer
        current = current[name];
        values[i].name = '' + current.length;
      } else {
        //Now index name becomes and name and we go deeper into the array
        current = current[name];
        values[i].name = rest.substring(0, pp) + rest.substring(pp + 1);
      }
    }
  }



  return post;
};

JCSmartFilter.prototype.hideFilterProps = function (element) {
  var obj = element.parentNode,
    filterBlock = obj.querySelector("[data-role='bx_filter_block']"),
    propAngle = obj.querySelector("[data-role='prop_angle']");

  if (BX.hasClass(obj, "bx-active")) {
    filterBlock.style.overflow = "hidden";
    new BX.easing({
      duration: 300,
      start: { opacity: 100, height: filterBlock.offsetHeight },
      finish: { opacity: 0, height: 0 },
      transition: BX.easing.transitions.quart,
      step: function (state) {
        filterBlock.style.opacity = state.opacity / 100;
        filterBlock.style.height = state.height + "px";
      },
      complete: function () {
        filterBlock.setAttribute("style", "");
        BX.removeClass(obj, "bx-active");
        BX.addClass(propAngle, "smart-filter-angle-down");
        BX.removeClass(propAngle, "smart-filter-angle-up");
      }
    }).animate();

  } else {
    filterBlock.style.display = "block";
    filterBlock.style.opacity = 0;
    filterBlock.style.height = "auto";
    filterBlock.style.overflow = "hidden";

    var obj_children_height = filterBlock.offsetHeight;
    filterBlock.style.height = 0;

    new BX.easing({
      duration: 300,
      start: { opacity: 0, height: 0 },
      finish: { opacity: 100, height: obj_children_height },
      transition: BX.easing.transitions.quart,
      step: function (state) {
        filterBlock.style.opacity = state.opacity / 100;
        filterBlock.style.height = state.height + "px";
      },
      complete: function () {
        filterBlock.style.overflow = "";
        BX.addClass(obj, "bx-active");
        BX.removeClass(propAngle, "smart-filter-angle-down");
        BX.addClass(propAngle, "smart-filter-angle-up");
      }
    }).animate();

  }
};

JCSmartFilter.prototype.showDropDownPopup = function (element, popupId) {
  var contentNode = element.querySelector('[data-role="dropdownContent"]');
  this.popups["smartFilterDropDown" + popupId] = BX.PopupWindowManager.create("smartFilterDropDown" + popupId,
    element,
    {
      autoHide: true,
      offsetLeft: 0,
      offsetTop: 3,
      overlay: false,
      draggable: { restrict: true },
      closeByEsc: true,
      content: BX.clone(contentNode)
    });
  this.popups["smartFilterDropDown" + popupId].show();
};

JCSmartFilter.prototype.selectDropDownItem = function (element, controlId) {
  this.keyup(BX(controlId));

  var wrapContainer = BX.findParent(BX(controlId),
    { className: "smart-filter-input-group-dropdown" },
    false);

  var currentOption = wrapContainer.querySelector('[data-role="currentOption"]');
  currentOption.innerHTML = element.innerHTML;
  BX.PopupWindowManager.getCurrentPopup().close();
};

BX.namespace("BX.Iblock.SmartFilter");
BX.Iblock.SmartFilter = (function () {
  /** @param {{
			leftSlider: string,
			rightSlider: string,
			tracker: string,
			trackerWrap: string,
			minInputId: string,
			maxInputId: string,
			minPrice: float|int|string,
			maxPrice: float|int|string,
			curMinPrice: float|int|string,
			curMaxPrice: float|int|string,
			fltMinPrice: float|int|string|null,
			fltMaxPrice: float|int|string|null,
			precision: int|null,
			colorUnavailableActive: string,
			colorAvailableActive: string,
			colorAvailableInactive: string
		}} arParams
   */
  var SmartFilter = function (arParams) {
    if (typeof arParams === 'object') {
      this.leftSlider = BX(arParams.leftSlider);
      this.rightSlider = BX(arParams.rightSlider);
      this.tracker = BX(arParams.tracker);
      this.trackerWrap = BX(arParams.trackerWrap);

      this.minInput = BX(arParams.minInputId);
      this.maxInput = BX(arParams.maxInputId);

      this.minPrice = parseFloat(arParams.minPrice);
      this.maxPrice = parseFloat(arParams.maxPrice);

      this.curMinPrice = parseFloat(arParams.curMinPrice);
      this.curMaxPrice = parseFloat(arParams.curMaxPrice);

      this.fltMinPrice = arParams.fltMinPrice ? parseFloat(arParams.fltMinPrice) : parseFloat(
        arParams.curMinPrice);
      this.fltMaxPrice = arParams.fltMaxPrice ? parseFloat(arParams.fltMaxPrice) : parseFloat(
        arParams.curMaxPrice);

      this.precision = arParams.precision || 0;

      this.priceDiff = this.maxPrice - this.minPrice;

      this.leftPercent = 0;
      this.rightPercent = 0;

      this.fltMinPercent = 0;
      this.fltMaxPercent = 0;

      this.colorUnavailableActive = BX(arParams.colorUnavailableActive);//gray
      this.colorAvailableActive = BX(arParams.colorAvailableActive);//blue
      this.colorAvailableInactive = BX(arParams.colorAvailableInactive);//light blue

      this.isTouch = false;

      this.init();

      if ('ontouchstart' in document.documentElement) {
        this.isTouch = true;

        BX.bind(this.leftSlider, "touchstart", BX.proxy(function (event) {
          this.onMoveLeftSlider(event)
        }, this));

        BX.bind(this.rightSlider, "touchstart", BX.proxy(function (event) {
          this.onMoveRightSlider(event)
        }, this));
      } else {
        BX.bind(this.leftSlider, "mousedown", BX.proxy(function (event) {
          this.onMoveLeftSlider(event)
        }, this));

        BX.bind(this.rightSlider, "mousedown", BX.proxy(function (event) {
          this.onMoveRightSlider(event)
        }, this));
      }

      BX.bind(this.minInput, "keyup", BX.proxy(function (event) {
        this.onInputChange();
      }, this));

      BX.bind(this.maxInput, "keyup", BX.proxy(function (event) {
        this.onInputChange();
      }, this));
    }
  };

  SmartFilter.prototype.init = function () {
    var priceDiff;

    if (this.curMinPrice > this.minPrice) {
      priceDiff = this.curMinPrice - this.minPrice;
      this.leftPercent = (priceDiff * 100) / this.priceDiff;

      this.leftSlider.style.left = this.leftPercent + "%";
      this.colorUnavailableActive.style.left = this.leftPercent + "%";
    }

    this.setMinFilteredValue(this.fltMinPrice);

    if (this.curMaxPrice < this.maxPrice) {
      priceDiff = this.maxPrice - this.curMaxPrice;
      this.rightPercent = (priceDiff * 100) / this.priceDiff;

      this.rightSlider.style.right = this.rightPercent + "%";
      this.colorUnavailableActive.style.right = this.rightPercent + "%";
    }

    this.setMaxFilteredValue(this.fltMaxPrice);
  };

  SmartFilter.prototype.setMinFilteredValue = function (fltMinPrice) {
    this.fltMinPrice = parseFloat(fltMinPrice);
    if (this.fltMinPrice >= this.minPrice) {
      var priceDiff = this.fltMinPrice - this.minPrice;
      this.fltMinPercent = (priceDiff * 100) / this.priceDiff;

      if (this.leftPercent > this.fltMinPercent)
        this.colorAvailableActive.style.left = this.leftPercent + "%";
      else
        this.colorAvailableActive.style.left = this.fltMinPercent + "%";

      this.colorAvailableInactive.style.left = this.fltMinPercent + "%";
    } else {
      this.colorAvailableActive.style.left = "0%";
      this.colorAvailableInactive.style.left = "0%";
    }
  };

  SmartFilter.prototype.setMaxFilteredValue = function (fltMaxPrice) {
    this.fltMaxPrice = parseFloat(fltMaxPrice);
    if (this.fltMaxPrice <= this.maxPrice) {
      var priceDiff = this.maxPrice - this.fltMaxPrice;
      this.fltMaxPercent = (priceDiff * 100) / this.priceDiff;

      if (this.rightPercent > this.fltMaxPercent)
        this.colorAvailableActive.style.right = this.rightPercent + "%";
      else
        this.colorAvailableActive.style.right = this.fltMaxPercent + "%";

      this.colorAvailableInactive.style.right = this.fltMaxPercent + "%";
    } else {
      this.colorAvailableActive.style.right = "0%";
      this.colorAvailableInactive.style.right = "0%";
    }
  };

  SmartFilter.prototype.getXCoord = function (elem) {
    var box = elem.getBoundingClientRect();
    var body = document.body;
    var docElem = document.documentElement;

    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;
    var left = box.left + scrollLeft - clientLeft;

    return Math.round(left);
  };

  SmartFilter.prototype.getPageX = function (e) {
    e = e || window.event;
    var pageX = null;

    if (this.isTouch && event.targetTouches[0] != null) {
      pageX = e.targetTouches[0].pageX;
    } else if (e.pageX != null) {
      pageX = e.pageX;
    } else if (e.clientX != null) {
      var html = document.documentElement;
      var body = document.body;

      pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0);
      pageX -= html.clientLeft || 0;
    }

    return pageX;
  };

  SmartFilter.prototype.recountMinPrice = function () {
    var newMinPrice = (this.priceDiff * this.leftPercent) / 100;
    newMinPrice = (this.minPrice + newMinPrice).toFixed(this.precision);

    if (newMinPrice != this.minPrice)
      this.minInput.value = newMinPrice;
    else
      this.minInput.value = "";
    /** @global JCSmartFilter smartFilter */
    smartFilter.keyup(this.minInput);
  };

  SmartFilter.prototype.recountMaxPrice = function () {
    var newMaxPrice = (this.priceDiff * this.rightPercent) / 100;
    newMaxPrice = (this.maxPrice - newMaxPrice).toFixed(this.precision);

    if (newMaxPrice != this.maxPrice)
      this.maxInput.value = newMaxPrice;
    else
      this.maxInput.value = "";
    /** @global JCSmartFilter smartFilter */
    smartFilter.keyup(this.maxInput);
  };

  SmartFilter.prototype.onInputChange = function () {
    var priceDiff;
    if (this.minInput.value) {
      var leftInputValue = this.minInput.value;
      if (leftInputValue < this.minPrice)
        leftInputValue = this.minPrice;

      if (leftInputValue > this.maxPrice)
        leftInputValue = this.maxPrice;

      priceDiff = leftInputValue - this.minPrice;
      this.leftPercent = (priceDiff * 100) / this.priceDiff;

      this.makeLeftSliderMove(false);
    }

    if (this.maxInput.value) {
      var rightInputValue = this.maxInput.value;
      if (rightInputValue < this.minPrice)
        rightInputValue = this.minPrice;

      if (rightInputValue > this.maxPrice)
        rightInputValue = this.maxPrice;

      priceDiff = this.maxPrice - rightInputValue;
      this.rightPercent = (priceDiff * 100) / this.priceDiff;

      this.makeRightSliderMove(false);
    }
  };

  SmartFilter.prototype.makeLeftSliderMove = function (recountPrice) {
    recountPrice = (recountPrice !== false);

    this.leftSlider.style.left = this.leftPercent + "%";
    this.colorUnavailableActive.style.left = this.leftPercent + "%";

    var areBothSlidersMoving = false;
    if (this.leftPercent + this.rightPercent >= 100) {
      areBothSlidersMoving = true;
      this.rightPercent = 100 - this.leftPercent;
      this.rightSlider.style.right = this.rightPercent + "%";
      this.colorUnavailableActive.style.right = this.rightPercent + "%";
    }

    if (this.leftPercent >= this.fltMinPercent && this.leftPercent <= (100 - this.fltMaxPercent)) {
      this.colorAvailableActive.style.left = this.leftPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.right = 100 - this.leftPercent + "%";
      }
    } else if (this.leftPercent <= this.fltMinPercent) {
      this.colorAvailableActive.style.left = this.fltMinPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.right = 100 - this.fltMinPercent + "%";
      }
    } else if (this.leftPercent >= this.fltMaxPercent) {
      this.colorAvailableActive.style.left = 100 - this.fltMaxPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.right = this.fltMaxPercent + "%";
      }
    }

    if (recountPrice) {
      this.recountMinPrice();
      if (areBothSlidersMoving)
        this.recountMaxPrice();
    }
  };

  SmartFilter.prototype.countNewLeft = function (event) {
    var pageX = this.getPageX(event);

    var trackerXCoord = this.getXCoord(this.trackerWrap);
    var rightEdge = this.trackerWrap.offsetWidth;

    var newLeft = pageX - trackerXCoord;

    if (newLeft < 0)
      newLeft = 0;
    else if (newLeft > rightEdge)
      newLeft = rightEdge;

    return newLeft;
  };

  SmartFilter.prototype.onMoveLeftSlider = function (e) {
    if (!this.isTouch) {
      this.leftSlider.ondragstart = function () {
        return false;
      };
    }

    if (!this.isTouch) {
      document.onmousemove = BX.proxy(function (event) {
        this.leftPercent = ((this.countNewLeft(event) * 100) / this.trackerWrap.offsetWidth);
        this.makeLeftSliderMove();
      }, this);

      document.onmouseup = function () {
        document.onmousemove = document.onmouseup = null;
      };
    } else {
      document.ontouchmove = BX.proxy(function (event) {
        this.leftPercent = ((this.countNewLeft(event) * 100) / this.trackerWrap.offsetWidth);
        this.makeLeftSliderMove();
      }, this);

      document.ontouchend = function () {
        document.ontouchmove = document.touchend = null;
      };
    }

    return false;
  };

  SmartFilter.prototype.makeRightSliderMove = function (recountPrice) {
    recountPrice = (recountPrice !== false);

    this.rightSlider.style.right = this.rightPercent + "%";
    this.colorUnavailableActive.style.right = this.rightPercent + "%";

    var areBothSlidersMoving = false;
    if (this.leftPercent + this.rightPercent >= 100) {
      areBothSlidersMoving = true;
      this.leftPercent = 100 - this.rightPercent;
      this.leftSlider.style.left = this.leftPercent + "%";
      this.colorUnavailableActive.style.left = this.leftPercent + "%";
    }

    if ((100 - this.rightPercent) >= this.fltMinPercent && this.rightPercent >= this.fltMaxPercent) {
      this.colorAvailableActive.style.right = this.rightPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.left = 100 - this.rightPercent + "%";
      }
    } else if (this.rightPercent <= this.fltMaxPercent) {
      this.colorAvailableActive.style.right = this.fltMaxPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.left = 100 - this.fltMaxPercent + "%";
      }
    } else if ((100 - this.rightPercent) <= this.fltMinPercent) {
      this.colorAvailableActive.style.right = 100 - this.fltMinPercent + "%";
      if (areBothSlidersMoving) {
        this.colorAvailableActive.style.left = this.fltMinPercent + "%";
      }
    }

    if (recountPrice) {
      this.recountMaxPrice();
      if (areBothSlidersMoving)
        this.recountMinPrice();
    }
  };

  SmartFilter.prototype.onMoveRightSlider = function (e) {
    if (!this.isTouch) {
      this.rightSlider.ondragstart = function () {
        return false;
      };
    }

    if (!this.isTouch) {
      document.onmousemove = BX.proxy(function (event) {
        this.rightPercent = 100 - (((this.countNewLeft(event)) * 100) / (this.trackerWrap.offsetWidth));
        this.makeRightSliderMove();
      }, this);

      document.onmouseup = function () {
        document.onmousemove = document.onmouseup = null;
      };
    } else {
      document.ontouchmove = BX.proxy(function (event) {
        this.rightPercent = 100 - (((this.countNewLeft(event)) * 100) / (this.trackerWrap.offsetWidth));
        this.makeRightSliderMove();
      }, this);

      document.ontouchend = function () {
        document.ontouchmove = document.ontouchend = null;
      };
    }

    return false;
  };

  return SmartFilter;
})();


document.addEventListener('mainJsLoaded', function () {
    $(document).on('selectric-before-change', '#filter_month', function (event, element, selectric) {
        setRangeDates();
        smartFilter.keyup(this);
    });
    $(document).on('selectric-before-change', '#filter_year', function (event, element, selectric) {
        setRangeDates();
        smartFilter.keyup(this);
    });
  function setRangeDates() {
    var index_month = parseInt($('#filter_month .select-ul li[class*="selected"]')
    .data('index')) - 1;
    var filter_month = index_month >= 0 ? parseInt($('input[name="element_month_' + index_month + '"]')
    .val()) : index_month;
    var filter_year = parseInt($('#filter_year .select-ul li[class*="selected"]').text());
    if (filter_month < 0) {
      var month_days = getLastDayOfMonth(filter_year, 11);
      $("#arrFilter_209_MIN").val("01.01" + "." + filter_year);
      $("#arrFilter_209_MAX").val(month_days + ".12." + filter_year);
    } else {
      var month_days = getLastDayOfMonth(filter_year, filter_month);
      $("#arrFilter_209_MIN").val("01." + (filter_month + 1) + "." + filter_year);
      $("#arrFilter_209_MAX").val(month_days + "." + (filter_month + 1) + "." + filter_year);
      $(document).on('selectric-before-change',
        '#filter_month',
        function (event, element, selectric) {
          setRangeDates();
          smartFilter.keyup(this);
        });
      $(document).on('selectric-before-change',
        '#filter_year',
        function (event, element, selectric) {
          setRangeDates();
          smartFilter.keyup(this);
        });

      function setRangeDates() {
        var index_month = parseInt($('#filter_month .select-ul li[class*="selected"]')
        .data('index')) - 1;
        var filter_month = index_month >= 0 ? parseInt($('input[data-name="element_month_' + index_month + '"]')
        .val()) : index_month;
        var filter_year = parseInt($('#filter_year .select-ul li[class*="selected"]').text());
        if (filter_month < 0) {
          var month_days = getLastDayOfMonth(filter_year, 11);
          $("#arrFilter_209_MIN").val("01.01" + "." + filter_year);
          $("#arrFilter_209_MAX").val(month_days + ".12." + filter_year);
        } else {
          var month_days = getLastDayOfMonth(filter_year, filter_month);
          $("#arrFilter_209_MIN").val("01." + (filter_month + 1) + "." + filter_year);
          $("#arrFilter_209_MAX").val(month_days + "." + (filter_month + 1) + "." + filter_year);
        }
      }

      function getLastDayOfMonth(year, month) {
        let date_new = new Date(year, month + 1, 0);
        return date_new.getDate();
      }
    }

    function getLastDayOfMonth(year, month) {
      let date_new = new Date(year, month + 1, 0);
      return date_new.getDate();
    }
  }
});

function updateStartDateAfterChangeNavYear (years) {
    let apiDates = $('[data-periods-api]').attr('data-periods-api');
    let closerMinYear, closerMaxYear;
    let datepickerObject = $('[data-filter-item-code="DATE_START"]').datepicker().data('datepicker');
    let currentYear = new Date().getFullYear();

    //если нет выбора дат ИЛИ даты уже выбраны - пропускаем
    //проблема в том что если даты выбраны и не пропускать - кадендарь перескакивает на "сегодня"
    if (!datepickerObject || datepickerObject.selectedDates.length) {
        return;
    }
    //если год не выбран переходим на текущий
    if (years.length < 1) {
        datepickerObject.date = App.datePicker.getStartDateByYear(apiDates, currentYear);
        return;
    }

    for (let i = 0; i < years.length; i += 1) {
        if(years[i] == currentYear) {
            datepickerObject.date = App.datePicker.getStartDateByYear(apiDates, currentYear);
            return;
        }
        if (years[i] < currentYear) {
            if (typeof closerMinYear !== "undefined" && closerMinYear != null) {
                if (years[i] > closerMinYear) {
                    closerMinYear = years[i];
                }
            } else {
                closerMinYear = years[i];
            }
        }
        if (years[i] > currentYear) {
            if (typeof closerMaxYear !== "undefined" && closerMaxYear != null ) {
                if (years[i] < closerMaxYear) {
                    closerMaxYear = years[i];
                }
            } else {
                closerMaxYear = years[i];
            }
        }
    }
    if (closerMaxYear != null && typeof closerMaxYear !== "undefined" && typeof apiDates[closerMaxYear] !== "undefined") {
        datepickerObject.date = App.datePicker.getStartDateByYear(apiDates, closerMaxYear);
        return;
    }
    if (closerMinYear != null && typeof closerMinYear !== "undefined" && typeof apiDates[closerMinYear] !== "undefined") {
        datepickerObject.date = App.datePicker.getStartDateByYear(apiDates, closerMinYear);
    }
}


/* End */
;
; /* Start:"a:4:{s:4:"full";s:85:"/local/components/citfact/catalog.settings/templates/.default/script.js?1648452886555";s:6:"source";s:71:"/local/components/citfact/catalog.settings/templates/.default/script.js";s:3:"min";s:0:"";s:3:"map";s:0:"";}"*/
$(".c-dialog__close, .c-dialog__overlay").on("click", function(e) {
    $(".c-dialog__overlay, .c-dialog__content").removeClass("c-dialog--active");
});

document.addEventListener('mainJsLoaded', function () {
    $('#cruises_list_pdf').click(function (e) {
        e.preventDefault()
        const found = $('.c-sort__found').data('found')
        if(found > 100) {
                $(".c-dialog__overlay, .c-dialog__content").addClass("c-dialog--active");
        } else {
            window.open($(this).attr('href'))
        }
    })
})

/* End */
;; /* /local/components/bitrix/catalog.smart.filter/script.js?165874913430928*/
; /* /local/components/citfact/catalog.settings/templates/.default/script.js?1648452886555*/
