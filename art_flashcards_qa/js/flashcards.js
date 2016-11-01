var CengageFlashcardsApp = (function() {
  var _currentCard, _currentChapter, _displayCards, _activeCards, _hiddenCards,
    _allCards, _supportsTouch, _storage, _index, _searchState = {}, _isShuffled = 0,
    _time = [];

  var _options = {
    // imageBasePath: "../../art/shared/image_library/2013_kleiner/images_2014/",
    imageBasePath: "../images/",
    thumbBasePath: "../../art/shared/image_library/2013_kleiner/thmbs/",
    initialChapter: "all",
    activeCardProps: ["artist", "title", "year", "medium", "dimensions", "extended_caption"],
    cardPropDisplay: ["artist", "title", "year", "medium", "dimensions", "description"],
    externalInit: false
  };

  function shuffleCards(shuffle) {
    showLoader();
    if (!shuffle) {
      // unshuffle
      _isShuffled = 0;
      $(".flashcards .ui-icon-fc-shuffle").removeClass("lit");
      _activeCards.sort(function(a, b) {
        return a.idx - b.idx;
      });
      getCards();
    } else {
      // shuffle
      var tmp_array = [];
      _isShuffled = 1;
      $(".flashcards .ui-icon-fc-shuffle").addClass("lit");
      while (_activeCards.length > 1) {
        var randomNum = Math.floor(Math.random() * _activeCards.length);
        tmp_array.push(_activeCards.splice(randomNum, 1)[0]);
      }
      tmp_array.push(_activeCards[0]);
      _activeCards = tmp_array;
      getCards(true);
    }
  };

  function removeCurrentCard() {
    if (!_displayCards.length) return;
    var idx = _activeCards.indexOf(_currentCard);
    _hiddenCards.push(_activeCards.splice(idx, 1)[0]);
    if (idx === _activeCards.length - 2)--idx;
    _currentCard = _activeCards[idx];
    getCards();
  };

  function showHiddenCards() {
    _activeCards = _activeCards.concat(_hiddenCards);
    if (!_isShuffled)
      shuffleCards(false); // sort cards
    _hiddenCards = [];
    getCards();
  };

  function gotoNextCard(dir) {
    var idx = _displayCards.indexOf(_currentCard);
    var new_idx = idx + dir;
    new_idx = new_idx < 0 ? _displayCards.length - 1 : new_idx == _displayCards.length ? 0 : new_idx;
    _currentCard = _displayCards[new_idx];
    loadCard();
    lightThumb();
    updateCardPosText();
  };

  function pickCard(e) {
    var t = $(e.target).is('img') ? $(e.target).parent() : e.target;
    var idx = $(".thumb-images div").index(t);
    _currentCard = _displayCards[idx];
    loadCard();
    lightThumb();
    updateCardPosText();
  }

  function loadCard() {
    loadImage();
    loadData();
    updateCardPosText();
    updateFigureNum();
  };

  function getCards(gotostart) {
    _displayCards = _activeCards.slice();

    if (_currentChapter != "all")
    // filter on chapter
      _displayCards = _displayCards.filter(function(item) {
        return item.chapter == _currentChapter;
      });
    if (_displayCards.length) {
      showNoCardsMsg(false);
      var idx = 0;
      // if _currentCard is not in _displayCards
      if (typeof _currentCard == "undefined" || _displayCards.indexOf(_currentCard) == -1 || gotostart)
        _currentCard = _displayCards[0];
      loadCard();
    } else {
      showNoCardsMsg(true);
    }

    loadThumbs();
    lightThumb();
    setSearchMsg();
    updateHiddenCount();
    saveState();
  };

  function showNoCardsMsg(show) {
    if (show) {
      $(".flashcards .content").hide();
      $(".flashcards .no-cards-msg").show();
      $(".flashcards .no-cards-msg").top = $("body").height() / 2;
    } else {
      $(".flashcards .content").show();
      $(".flashcards .no-cards-msg").hide();
    }
  }

  function loadData() {
    var list = $(".flashcards .review-content");
    list.find(".artist ul li").html(_currentCard["artist"]);
    list.find(".title ul li").html(_currentCard["title"]);
    list.find(".description ul li").html(_currentCard["extended_caption"]);
    list.find(".year ul li").html(_currentCard["year"]);
    list.find(".medium ul li").html(_currentCard["medium"]);
    list.find(".dimensions ul li").html(_currentCard["dimensions"]);
  };

  function loadImage() {
    showLoader();
    var ch = ((_currentCard.chapter < 10) ? "ch0" : "ch") + _currentCard.chapter;
    var image_url = _options.imageBasePath + ch + "/" + _options.screenwidth + "/" + _currentCard.filename;

    var img = $(".flashcards .image .img0");
    if (typeof img.attr("src") == "undefined" || img.attr("src").indexOf(image_url) == -1) {
      // if image not current image
      img.attr({
        "src": image_url + ".jpg",
        "alt": _currentCard.title
      });
    } else {
      hideLoader();
    }
  };

  function loadThumbs() {

    var container = $("<div class='thumb-images' />");
    for (var i = 0; i < _displayCards.length; i++) {
      var ch = ((_displayCards[i].chapter < 10) ? "ch0" : "ch") + _displayCards[i].chapter;
      //var image_url = _options.imageBasePath + ch + "/thmb/" + _displayCards[i].filename;
      var image_url = _options.thumbBasePath + ch + "/" + _displayCards[i].filename;
      var el = $("<div/>")
        .append($("<img class='lazy'>").attr({
          "data-original": image_url + ".jpg",
          "alt": _displayCards[i].title,
          "data-idx": _displayCards.idx
        }))
        .click(function(e) {
          pickCard(e);
        });

      container.append(el);
    }

    $(".flashcards .thumbs .thumb-images").remove();
    $(".flashcards .thumbs").append(container);
    $(".flashcards .thumbs img.lazy").lazyload({
      container: $(".flashcards .thumbs"),
      skip_invisible: false
    });

  }

  function lightThumb() {
    $(".flashcards .thumbs .thumb-images div").removeClass("lit");
    var idx = _displayCards.indexOf(_currentCard);
    $(".flashcards .thumbs .thumb-images div").eq(idx).addClass("lit");
  }

  function setSearchMsg() {
    if ($(".flashcards .search-input").val().length) {
      var msg = "chapter " + _currentChapter;
      if (_currentChapter == "all")
        msg = "all chapters";
      $(".flashcards .currently-viewing-val").html(msg);
      $(".flashcards .matches-all").text(_activeCards.length);
      $(".flashcards .matches-chapter").text(_displayCards.length);
    }
  }

  function indexCards() {
    // index data for search
    if (!_index) {
      _index = lunr(function() {
        for (var i in _allCards[0]) {
          if (i != "filename") {
            var b = 1;
            if (i == "title") b = 20;
            if (i == "extended_caption") b = 10;
            if (i == "artist") b = 5;
            this.field(i, {
              boost: b
            });
          }
          this.ref("filename");
        }
      });

      for (var i = 0; i < _allCards.length; i++) {
        _index.add(_allCards[i]);
      }
    }

    hideLoader();
  }

  function initSearch() {
    // searches all cards
    _searchState.text = $(".flashcards .search-input").val();
    if (_searchState.text.length) {
      var results = _index.search(_searchState.text);
      var dest_array = [];
      for (var j = 0; j < results.length; j++) {
        for (var i = 0; i < _allCards.length; i++) {
          if (results[j].ref == _allCards[i].filename) {
            dest_array.push(_allCards[i]);
            break;
          }
        }
      }
      _activeCards = dest_array;
      showSearchOutput(_searchState.isActive = true);
    } else {
      _activeCards = _allCards.slice();
      showSearchOutput(_searchState.isActive = false);
      _searchState.text = "";
    }
    for (var i = 0; i < _hiddenCards.length; i++) {
      for (var j = 0; j < _activeCards.length; j++) {
        if (_hiddenCards[i].filename == _activeCards[j].filename) {
          _activeCards.splice(j, 1);
        }
      }
    }
    getCards(true);
  }

  function setChapter() {
    _currentChapter = $(".flashcards .menu-chapter select").val();
    getCards();
  }

  function updateSelect() {
    $(".titlebar .menu-chapter select")[0].selectedIndex = _currentChapter;
    $(".titlebar .menu-chapter select").selectmenu('refresh');
  }

  function updateCardPosText() {
    var idx = _displayCards.indexOf(_currentCard);
    $(".flashcards .card-pos").html("Card " + (idx + 1) + " of " + _displayCards.length);
  }

  function updateFigureNum() {
    $(".flashcards .image .figure").html("<span class='number'>" + _currentCard.figure + ",</span><span class='credit'>&#160;" + _currentCard.credit + "</span>");
  }

  function updateHiddenCount() {
    $(".flashcards .hidden-count").html(_hiddenCards.length || "");
  }

  function showSearchOutput(show) {
    if (show) {
      $(".flashcards .search-input").val(_searchState.text);
      $(".flashcards .ui-input-search .ui-input-clear").show();
      $(".flashcards .search-output").fadeIn();
    } else {
      $(".flashcards .search-output").fadeOut();
    }
  }

  function showMenus(show) {
    if (show) {
      $(".flashcards .titlebar").animate({
        "opacity": 1
      });
      $(".flashcards .thumbs").animate({
        "opacity": 1
      });
      if (_searchState.isActive)
        showSearchOutput(true);
      if (_supportsTouch)
        $(".flashcards .mobile-menu-btn").hide();
    } else {
      $(".flashcards .titlebar").animate({
        "opacity": 0
      });
      $(".flashcards .thumbs").animate({
        "opacity": 0
      });
      showSearchOutput(false);
      if (_supportsTouch)
        $(".flashcards .mobile-menu-btn").show();
    }
  }

  function showNav(show) {
    if (show) {
      $(".flashcards .prev").animate({
        "opacity": 1
      });
      $(".flashcards .next").animate({
        "opacity": 1
      });
    } else {
      $(".flashcards .prev").animate({
        "opacity": 0
      });
      $(".flashcards .next").animate({
        "opacity": 0
      });
    }
  };

  function initStorage() {
    var fail, uid;
    try {
      uid = new Date;
      (_storage = window.localStorage).setItem(uid, uid);
      fail = storage.getItem(uid) != uid;
      _storage.removeItem(uid);
      fail && _storage;
    } catch (e) {}

    // _storage.clear();
  }

  function saveState() {
    if (!_storage) return;

    var cards = [];
    var state = {};

    for (var i = 0; i < _hiddenCards.length; i++) {
      for (var j = 0; j < _allCards.length; j++) {
        if (_hiddenCards[i].filename == _allCards[j].filename)
        // store card idx in allCards
          cards.push(j);
      }
    }

    state.isShuffled = _isShuffled;
    state.currentChapter = _currentChapter;
    state.searchState = _searchState;
    state.hiddenCards = cards.sort(function(a, b) {
      return a - b;
    });
    try {
      var key = _options.product + "_" + _options.initialChapter;
      _storage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.log("Error saving localStorage: " + e);
    }

  }

  function loadState() {
    _activeCards = _allCards.slice();
    _hiddenCards = [];

    if (!_storage) return;

    try {
      var key = _options.product + "_" + _options.initialChapter;
      var state = JSON.parse(_storage.getItem(key));
    } catch (e) {
      console.log("Error loading localStorage: " + e);
    }

    if (state) {
      _currentChapter = state.currentChapter;
      _isShuffled = state.isShuffled;
      for (var i = 0; i < state.hiddenCards.length; i++) {
        _hiddenCards.push(_activeCards.splice(state.hiddenCards[i] - i, 1)[0]);
      }
      if (_options.externalInit) _currentChapter = _options.initialChapter;
      if (_isShuffled) {
        $(".flashcards .ui-icon-fc-shuffle").addClass("lit");
        shuffleCards(true);
      }
      if (typeof state.searchState !== "undefined" && typeof state.searchState.text !== "undefined") {
        _searchState = state.searchState;
        $(".flashcards .search-input").val(_searchState.text);
        initSearch();
      }
    }

    updateSelect();

  }


  function updateLayout() {

    if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {
      // safari viewport is bigger than window. This works good enough.
      $(".ui-mobile, .ui-mobile body").css("height", "98%");
    }
    var img = $(".flashcards .image .img0");
    var mt = 5; // margin when .flip is applied.
    var maxh = $("body").height() - $(".flashcards .image .figure").height() - $(".flashcards .image .card-pos").height() - (mt * 2) - 2;
    img.css("max-height", maxh);
    if (img.width() / img.height() > 1) {
      // center image vertically. set margin to 1/2 free space
      img.css("margin-top", (maxh - img.height()) / 2);
    } else {
      img.css("margin-top", 0);
    }
    // adjust search output loc
    var tb = $(".flashcards .titlebar");
    $(".flashcards .search-output").css("top", tb.height() - mt);

    // resize layer with flip card msg (only visible initially)
    $(".flashcards .flip-img-layer img").css("margin-top", maxh / 2);

    // resize .main so that border hugs window edges in review panel.
    $(".flashcards .main").height($("body").height() - mt * 2);

    // make watermark responsive to width changes.
    var w = $(".flashcards .watermark").width();
    var wtxt = $(".flashcards .watermark-txt").width();
    $(".flashcards .watermark-txt").css("right", (wtxt - w) / 2 * -1);

    // set path to proper image resolution
    var w = $(window).width()
    _options.screenwidth = w < 800 ? "sm" : w < 1060 ? "md" : "lg";
  }

  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
      vars[key] = value;
    });
    return vars;
  }

  function showLoader(msg) {
    var props = {};
    if (msg) {
      props.text = msg;
      props.textVisible = true;
    }
    $.mobile.loading('show', props);
  };

  function hideLoader() {
    $.mobile.loading('hide');
  };

  function flipcard() {
    showMenus(false);
    $(".flashcards .main").toggleClass('flip');
    if ($(".flashcards .main.flip").length) {
      $(".flashcards .watermark").delay(200).fadeIn();
    } else {
      $(".flashcards .watermark").hide();
    }
  }

  function addListeners() {
    // if menu is visible hide it else flip
    $(".flashcards .main").click(function(e) {
      if ($(".flashcards .titlebar").css("opacity") > 0) {
        showMenus(false);
        showNav(false);
      } else {
        flipcard();
      }
    });

    _supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;

    // configure for mobile
    if (_supportsTouch) {

      $(".flashcards").addClass("mobile");

      // display menu button
      $(".flashcards .main")
        .on("swipeleft", function(e) {
          gotoNextCard(1);
          showMenus(false);
        })
        .on("swiperight", function(e) {
          gotoNextCard(-1);
          showMenus(false);
        });

      $(".flashcards .mobile-menu-btn").tap(function(e) {
        showMenus(true);
      });

    } else {
      // configure for desktop
      $(".flashcards .prev")
        .mouseenter(
          function(e) {
            showNav(true);
          })
        .mouseleave(
          function(e) {
            showNav(false);
          });

      $(".flashcards .next")
        .mouseenter(
          function(e) {
            showNav(true);
          })
        .mouseleave(
          function(e) {
            showNav(false);
          });

      $(".flashcards .search-output")
        .mouseenter(
          function(e) {
            //clear showMenus(false) so menu and search output stay visible
            clearTimeout($(this).data('timeoutId'));
          })
        .mouseleave(
          function(e) {
            // delay hiding the menus
            timeoutId = setTimeout(function() {
              showMenus(false);
            }, 200);
            // store id in search-output element
            $(this).data('timeoutId', timeoutId);
          });

      $(".flashcards .titlebar").mouseleave(function(e) {

        if (!$(".titlebar .menu-chapter select").is(':focus')) {
          // delay hiding the menus
          timeoutId = setTimeout(function() {
            showMenus(false);
          }, 200);
          // store id in search-output element
          $(".flashcards .search-output").data('timeoutId', timeoutId);
        }
      }).mouseenter(function(e) {
        //clear showMenus(false) so menu stays visible
        clearTimeout($(".flashcards .search-output").data('timeoutId'));
        showMenus(true);
      });

      $(".flashcards .thumbs").mouseleave(function(e) {
        showMenus(false);
      }).mouseenter(function(e) {
        showMenus(true);
      });
    }

    // add click to prev and next
    $(".flashcards .prev-arrow").click(function(e) {
      gotoNextCard(-1);
      return false;
    })
      .mouseover(
        function(e) {
          showMenus(false);
        });

    $(".flashcards .next-arrow").click(function(e) {
      gotoNextCard(1);
      return false;
    })
      .mouseover(
        function(e) {
          showMenus(false);
        });

    // select chapter
    $(".titlebar .menu-chapter").change(function() {
      setChapter();
    });

    // left/right arrow keys
    $("body").keydown(function(e) {
      if ($(".flashcards .flip-img-layer:visible").length) {
        $(".flashcards .flip-img-layer").hide();
        $(".flashcards .main").click();
        return;
      }
      console.log(e.keyCode);
      if (e.keyCode == 37) {
        gotoNextCard(-1);
        showNav(false);
        showMenus(false);
      } else if (e.keyCode == 39) {
        gotoNextCard(1);
        showNav(false);
        showMenus(false);
      } else if (e.keyCode == 38 || e.keyCode == 40) {
        flipcard();
      }
    });

    // search on enter
    $(".flashcards .search-input").change(function() {
      // hide virtual keyboard
      $(".flashcards .search-input").blur();
      initSearch();
    });

    $(".flashcards .shuffle").click(function() {
      shuffleCards(!_isShuffled);
    });

    $(".flashcards .remove").click(function() {
      removeCurrentCard();
    });

    $(".flashcards .show").click(function() {
      showHiddenCards();
    });

    $(".flashcards .flip-img-layer").click(function() {
      $(this).hide();
      $(".flashcards .main").click();
    });

    $(".flashcards .match-btn").click(function() {
      $(".titlebar .menu-chapter select option:eq(0)").prop('selected', true);
      $(".titlebar .menu-chapter select").selectmenu('refresh');
      setChapter();
    });

    // blur select when clicked outside
    $(document).mouseup(function(event) {
      var s = $(".flashcards .menu-chapter select");
      if (!$(event.target).is(s) && !$(event.target).is(s.find("option"))) {
        s.blur();
      }
    });
  }

  function init(opt) {

    showLoader("initializing...");

    var options = opt || {};
    options = $.extend(options, getUrlVars());
    if (Object.keys(options).length) {
      $.extend(_options, options);
      _options.externalInit = (typeof options.initialChapter !== "undefined");
    }

    // if non-numeric intial chapter, set to all
    _currentChapter = isNaN(parseInt(_options.initialChapter)) ? "all" : _options.initialChapter;
    // set to "all" if not set.
    _options.initialChapter = _currentChapter;

    initStorage();

    $(".flashcards .image .img0").load(function(e) {
      updateLayout();
      hideLoader();
    });

    $(window).resize(function() {
      updateLayout();
    }).load(function() {
      updateLayout();
    });

    //hinder easy download of the image by killing context menu
    $(".flashcards .image .img0").on('contextmenu', function(e) {
      return false;
    });

    // load card data
    var jqxhr = $.ajax("flashcard_data.json")
      .done(function(data, textStatus, jqXHR) {
        _allCards = data.cardList.slice();

        if (!_index) {
          showLoader("indexing cards...");
          indexCards();
        }
        loadState();
        getCards();
        $(".flashcards .flip-img-layer").show();
        addListeners();
      })
      .fail(function(e) {
        console.log("Failed to load flashcard_data.json: " + e);
        hideLoader();
      });

  };

  // expose API
  return {
    initFlashcards: init
  };

})();