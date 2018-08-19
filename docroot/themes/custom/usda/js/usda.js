/**
* jquery-match-height master by @liabru
* http://brm.io/jquery-match-height/
* License: MIT
*/
(function(factory) { // eslint-disable-line no-extra-semi
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Global
        factory(jQuery);
    }
})(function($) {
    /*
    *  internal
    */

    var _previousResizeWidth = -1,
        _updateTimeout = -1;

    /*
    *  _parse
    *  value parse utility function
    */

    var _parse = function(value) {
        // parse value and convert NaN to 0
        return parseFloat(value) || 0;
    };

    /*
    *  _rows
    *  utility function returns array of jQuery selections representing each row
    *  (as displayed after float wrapping applied by browser)
    */

    var _rows = function(elements) {
        var tolerance = 1,
            $elements = $(elements),
            lastTop = null,
            rows = [];

        // group elements by their top position
        $elements.each(function(){
            var $that = $(this),
                top = $that.offset().top - _parse($that.css('margin-top')),
                lastRow = rows.length > 0 ? rows[rows.length - 1] : null;

            if (lastRow === null) {
                // first item on the row, so just push it
                rows.push($that);
            } else {
                // if the row top is the same, add to the row group
                if (Math.floor(Math.abs(lastTop - top)) <= tolerance) {
                    rows[rows.length - 1] = lastRow.add($that);
                } else {
                    // otherwise start a new row group
                    rows.push($that);
                }
            }

            // keep track of the last row top
            lastTop = top;
        });

        return rows;
    };

    /*
    *  _parseOptions
    *  handle plugin options
    */

    var _parseOptions = function(options) {
        var opts = {
            byRow: true,
            property: 'height',
            target: null,
            remove: false
        };

        if (typeof options === 'object') {
            return $.extend(opts, options);
        }

        if (typeof options === 'boolean') {
            opts.byRow = options;
        } else if (options === 'remove') {
            opts.remove = true;
        }

        return opts;
    };

    /*
    *  matchHeight
    *  plugin definition
    */

    var matchHeight = $.fn.matchHeight = function(options) {
        var opts = _parseOptions(options);

        // handle remove
        if (opts.remove) {
            var that = this;

            // remove fixed height from all selected elements
            this.css(opts.property, '');

            // remove selected elements from all groups
            $.each(matchHeight._groups, function(key, group) {
                group.elements = group.elements.not(that);
            });

            // TODO: cleanup empty groups

            return this;
        }

        if (this.length <= 1 && !opts.target) {
            return this;
        }

        // keep track of this group so we can re-apply later on load and resize events
        matchHeight._groups.push({
            elements: this,
            options: opts
        });

        // match each element's height to the tallest element in the selection
        matchHeight._apply(this, opts);

        return this;
    };

    /*
    *  plugin global options
    */

    matchHeight.version = 'master';
    matchHeight._groups = [];
    matchHeight._throttle = 80;
    matchHeight._maintainScroll = false;
    matchHeight._beforeUpdate = null;
    matchHeight._afterUpdate = null;
    matchHeight._rows = _rows;
    matchHeight._parse = _parse;
    matchHeight._parseOptions = _parseOptions;

    /*
    *  matchHeight._apply
    *  apply matchHeight to given elements
    */

    matchHeight._apply = function(elements, options) {
        var opts = _parseOptions(options),
            $elements = $(elements),
            rows = [$elements];

        // take note of scroll position
        var scrollTop = $(window).scrollTop(),
            htmlHeight = $('html').outerHeight(true);

        // get hidden parents
        var $hiddenParents = $elements.parents().filter(':hidden');

        // cache the original inline style
        $hiddenParents.each(function() {
            var $that = $(this);
            $that.data('style-cache', $that.attr('style'));
        });

        // temporarily must force hidden parents visible
        $hiddenParents.css('display', 'block');

        // get rows if using byRow, otherwise assume one row
        if (opts.byRow && !opts.target) {

            // must first force an arbitrary equal height so floating elements break evenly
            $elements.each(function() {
                var $that = $(this),
                    display = $that.css('display');

                // temporarily force a usable display value
                if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                    display = 'block';
                }

                // cache the original inline style
                $that.data('style-cache', $that.attr('style'));

                $that.css({
                    'display': display,
                    'padding-top': '0',
                    'padding-bottom': '0',
                    'margin-top': '0',
                    'margin-bottom': '0',
                    'border-top-width': '0',
                    'border-bottom-width': '0',
                    'height': '100px',
                    'overflow': 'hidden'
                });
            });

            // get the array of rows (based on element top position)
            rows = _rows($elements);

            // revert original inline styles
            $elements.each(function() {
                var $that = $(this);
                $that.attr('style', $that.data('style-cache') || '');
            });
        }

        $.each(rows, function(key, row) {
            var $row = $(row),
                targetHeight = 0;

            if (!opts.target) {
                // skip apply to rows with only one item
                if (opts.byRow && $row.length <= 1) {
                    $row.css(opts.property, '');
                    return;
                }

                // iterate the row and find the max height
                $row.each(function(){
                    var $that = $(this),
                        style = $that.attr('style'),
                        display = $that.css('display');

                    // temporarily force a usable display value
                    if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                        display = 'block';
                    }

                    // ensure we get the correct actual height (and not a previously set height value)
                    var css = { 'display': display };
                    css[opts.property] = '';
                    $that.css(css);

                    // find the max height (including padding, but not margin)
                    if ($that.outerHeight(false) > targetHeight) {
                        targetHeight = $that.outerHeight(false);
                    }

                    // revert styles
                    if (style) {
                        $that.attr('style', style);
                    } else {
                        $that.css('display', '');
                    }
                });
            } else {
                // if target set, use the height of the target element
                targetHeight = opts.target.outerHeight(false);
            }

            // iterate the row and apply the height to all elements
            $row.each(function(){
                var $that = $(this),
                    verticalPadding = 0;

                // don't apply to a target
                if (opts.target && $that.is(opts.target)) {
                    return;
                }

                // handle padding and border correctly (required when not using border-box)
                if ($that.css('box-sizing') !== 'border-box') {
                    verticalPadding += _parse($that.css('border-top-width')) + _parse($that.css('border-bottom-width'));
                    verticalPadding += _parse($that.css('padding-top')) + _parse($that.css('padding-bottom'));
                }

                // set the height (accounting for padding and border)
                $that.css(opts.property, (targetHeight - verticalPadding) + 'px');
            });
        });

        // revert hidden parents
        $hiddenParents.each(function() {
            var $that = $(this);
            $that.attr('style', $that.data('style-cache') || null);
        });

        // restore scroll position if enabled
        if (matchHeight._maintainScroll) {
            $(window).scrollTop((scrollTop / htmlHeight) * $('html').outerHeight(true));
        }

        return this;
    };

    /*
    *  matchHeight._applyDataApi
    *  applies matchHeight to all elements with a data-match-height attribute
    */

    matchHeight._applyDataApi = function() {
        var groups = {};

        // generate groups by their groupId set by elements using data-match-height
        $('[data-match-height], [data-mh]').each(function() {
            var $this = $(this),
                groupId = $this.attr('data-mh') || $this.attr('data-match-height');

            if (groupId in groups) {
                groups[groupId] = groups[groupId].add($this);
            } else {
                groups[groupId] = $this;
            }
        });

        // apply matchHeight to each group
        $.each(groups, function() {
            this.matchHeight(true);
        });
    };

    /*
    *  matchHeight._update
    *  updates matchHeight on all current groups with their correct options
    */

    var _update = function(event) {
        if (matchHeight._beforeUpdate) {
            matchHeight._beforeUpdate(event, matchHeight._groups);
        }

        $.each(matchHeight._groups, function() {
            matchHeight._apply(this.elements, this.options);
        });

        if (matchHeight._afterUpdate) {
            matchHeight._afterUpdate(event, matchHeight._groups);
        }
    };

    matchHeight._update = function(throttle, event) {
        // prevent update if fired from a resize event
        // where the viewport width hasn't actually changed
        // fixes an event looping bug in IE8
        if (event && event.type === 'resize') {
            var windowWidth = $(window).width();
            if (windowWidth === _previousResizeWidth) {
                return;
            }
            _previousResizeWidth = windowWidth;
        }

        // throttle updates
        if (!throttle) {
            _update(event);
        } else if (_updateTimeout === -1) {
            _updateTimeout = setTimeout(function() {
                _update(event);
                _updateTimeout = -1;
            }, matchHeight._throttle);
        }
    };

    /*
    *  bind events
    */

    // apply on DOM ready event
    $(matchHeight._applyDataApi);

    // update heights on load and resize events
    $(window).bind('load', function(event) {
        matchHeight._update(false, event);
    });

    // throttled update heights on resize events
    $(window).bind('resize orientationchange', function(event) {
        matchHeight._update(true, event);
    });

});
;
(function ($, Drupal) {
  Drupal.behaviors.usda = {
    attach: function (context, settings) {
      $('.paragraph--type-dropdown-menu-slider', context).one('usdaDropdownSlider').each(function (i) {
        // Add <label> around <h2> contents
        var dropdownId = 'dropdown_menu_slider_' + i;
        $('h2', this).wrapInner('<label for="' + dropdownId + '"/>');
        // Convert <ul> to <select> and wire up events
        var $options = $('li', this).wrapInner('<option/>').find('option');
        var maxOptionLength = Math.max.apply(this, $('li', this).map(function(){return $(this).text().length;}));
        var $heros = $(this).nextUntil(':not(.paragraph--type-basic-hero)');
        var width = Math.min(160 + 8 * maxOptionLength, $(window).width() * .9);
        $('<select id="' + dropdownId + '"/>').append($options).appendTo($('div', this)).css('width', width)
        .bind('change', function(e) {
          $heros.hide().eq(this.selectedIndex).show();
        });
        $heros.not(':eq(0)').hide();
        $('ul', this).remove();
      });

      // Add accessibility labels to generic landmarks that don't have them.
      var labelMap = {
        'section.paragraph--type-basic-hero': 'Promoted Content',
        'figure[role=group]': 'Figure'
      };
      $.each(labelMap, function(selector, label) {
        $(selector.replace(/,|$/, ':not([aria-label]):not([aria-labelledby])'))
          .attr('aria-label', function(i, attr) {return label + ' ' + (i+1);});
      });

      var paragraphsColumnHeader = $('.usda-paragraph-column > *:first-child');
      // set equal height
      paragraphsColumnHeader.matchHeight();
      // add span to first-child element
      paragraphsColumnHeader.each(function() {
        $(this).wrapInner("<span></span>");
      });

      // Allow clicking the logo to navigate to the home page.
      $('.usda-logo').on('click', function() {
        location.href = '/';
      });

      // Close active nav menu on background click.
      var $menu = $('nav#block-usda-main-menu');
      if($menu.length > 0) {
        $('html').click(function(e) {
          if(e.target && !($('body').hasClass('usa-mobile_nav-active')) && !($.contains($menu[0], e.target))) {
            $('button[aria-expanded="true"]', $menu).trigger('click');
          }
        });
      }
    }
  };
})(jQuery, Drupal);
;
(function ($, Drupal) {
  Drupal.behaviors.usda = {
    attach: function (context, settings) {

      var max_chars = 5;

      $('#zip').keydown( function(e){
        if ($(this).val().length >= max_chars) {
          $(this).val($(this).val().substr(0, max_chars));
        }
      });

      $('#zip').keyup( function(e){
        if ($(this).val().length >= max_chars) {
          $(this).val($(this).val().substr(0, max_chars));
        }
      });

			$('#weather-search').click(function(e) {
				e.preventDefault();
			  var data = '';
			  var zip = $('#zip').val();
			  var url = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?Postal=' + zip + '&f=pjson';
			  $.getJSON(url)
			  .done(function(data) {
		      //console.log(data);
		      //console.log(data.candidates.length);
		      if(data.candidates.length == '0'){
  		      //console.log('Zip code not valid.');
  		      alert('Zip code not valid.');
  		      return;
		      }
		      var x = data.candidates["0"].location.x;
		      var y = data.candidates["0"].location.y;
		      $.getJSON('https://forecast.weather.gov/MapClick.php?&lat=' + y + '&lon=' + x + '&FcstType=json')
		      .done(function(weather) {
  		      //console.log('https://forecast.weather.gov/MapClick.php?&lat=' + y + '&lon=' + x + '&FcstType=json');
  		      //console.log(weather.time);
  		      if(weather.success == false) {
    		      //console.log('Weather not found for this location. Choose another.');
    		      alert('Weather not found for this location. Choose another.');
    		      return;
  		      }
		      	$('#temp').html(weather.currentobservation.Temp + '&#176;');
		      	$('#location').html(weather.location.areaDescription);
		      	var obs = weather.currentobservation.Weather;
		      	if (obs == '') {
  		      	obs = weather.data.weather["0"];
		      	}
		      	var icon = '';
						switch (obs) {
  						case 'Sunny':
							case 'Fair':
							case 'Clear':
							case 'Fair with Haze':
							case 'Clear with Haze':
							case 'Mostly Clear':
							case 'Fair and Breezy':
							case 'Clear and Breezy':
								icon = 'fair-clear-fair-clear-haze-fair-breezy-clear-breezy.svg';
								break;
							case 'Mostly Cloudy':
							case 'Mostly Cloudy with Haze':
							case 'Mostly Cloudy and Breezy':
							case 'A Few Clouds':
							case 'Chance T-storms':
							case 'A Few Clouds with Haze':
							case 'A Few Clouds and Breezy':
							case 'Partly Cloudy':
							case 'Partly Cloudy with Haze':
							case 'Partly Cloudy and Breezy':
							case 'Partly Cloudy then Slight Chance Showers':
							case 'Chance T-storms then Chance Showers':
							  icon = 'few-cloudy-haze-breezy.svg';
							  break;
							case 'Overcast':
							case 'Overcast with Haze':
							case 'Overcast and Breezy':
							  icon = 'overcast-haze-breezy.svg';
							  break;
							case 'Fog/Mist':
							case 'Fog':
							case 'Freezing Fog':
							case 'Shallow Fog':
							case 'Partial Fog':
							case 'Patches of Fog':
							case 'Patchy Fog then Sunny':
							case 'Patchy Fog':
							case 'Fog in Vicinity':
							case 'Freezing Fog in Vicinity':
							case 'Shallow Fog in Vicinity':
							case 'Partial Fog in Vicinity':
							case 'Patches of Fog in Vicinity':
							case 'Showers in Vicinity Fog':
							case 'Heavy Freezing Fog':
							case 'Light Freezing Fog':
								icon = 'fog-mist.svg';
								break;
							case 'Smoke':
								icon = 'smoke.svg';
								break;
							case 'Freezing Rain':
							case 'Freezing Drizzle':
							case 'Light Freezing Rain':
							case 'Light Freezing Drizzle':
							case 'Heavy Freezing Rain':
							case 'Heavy Freezing Drizzle':
							case 'Freezing Rain in Vicinity':
							case 'Freezing Drizzle in Vicinity':
							case 'Ice Pellets':
							case 'Light Ice Pellets':
							case 'Heavy Ice Pellets':
							case 'Ice Pellets in Vicinity':
							case 'Showers Ice Pellets':
							case 'Thunderstorm Ice Pellets':
							case 'Ice Crystals':
							case 'Hail':
							case 'Small Hail/Snow Pellets':
							case 'Light Small Hail/Snow Pellets':
							case 'Heavy small Hail/Snow Pellets':
							case 'Showers Hail':
							case 'Hail Showers':
							case 'Freezing Rain Snow':
							case 'Light Freezing Rain Snow':
							case 'Heavy Freezing Rain Snow':
							case 'Freezing Drizzle Snow':
							case 'Light Freezing Drizzle Snow':
							case 'Heavy Freezing Drizzle Snow':
							case 'Snow Freezing Rain':
							case 'Light Snow Freezing Rain':
							case 'Heavy Snow Freezing Rain':
							case 'Snow Freezing Drizzle':
							case 'Light Snow Freezing Drizzle':
							case 'Heavy Snow Freezing Drizzle':
							case 'Rain Ice Pellets':
							case 'Light Rain Ice Pellets':
							case 'Heavy Rain Ice Pellets':
							case 'Drizzle Ice Pellets':
							case 'Light Drizzle Ice Pellets':
							case 'Heavy Drizzle Ice Pellets':
							case 'Ice Pellets Rain':
							case 'Light Ice Pellets Rain':
							case 'Heavy Ice Pellets Rain':
							case 'Ice Pellets Drizzle':
							case 'Light Ice Pellets Drizzle':
							case 'Heavy Ice Pellets Drizzle':
							case 'Rain Snow':
							case 'Light Rain Snow':
							case 'Heavy Rain Snow':
							case 'Snow Rain':
							case 'Light Snow Rain':
							case 'Heavy Snow Rain':
							case 'Drizzle Snow':
							case 'Light Drizzle Snow':
							case 'Snow Drizzle':
							case 'Light Snow Drizzle':
							case 'Heavy Drizzle Snow':
								icon = 'freezing-rain-ice.svg';
								break;
							case 'Rain Showers':
							case 'Light Rain Showers':
							case 'Light Rain and Breezy':
							case 'Heavy Rain Showers':
							case 'Rain Showers in Vicinity':
							case 'Light Showers Rain':
							case 'Heavy Showers Rain':
							case 'Showers Rain':
							case 'Showers Rain in Vicinity':
							case 'Rain Showers Fog/Mist':
							case 'Light Rain Showers Fog/Mist':
							case 'Heavy Rain Showers Fog/Mist':
							case 'Rain Showers in Vicinity Fog/Mist':
							case 'Light Showers Rain Fog/Mist':
							case 'Heavy Showers Rain Fog/Mist':
							case 'Showers Rain Fog/Mist':
							case 'Showers Rain in Vicinity Fog/Mist':
								icon = 'rain-showers.svg';
								break;
							case 'Thunderstorm':
							case 'Thunderstorm Rain':
							case 'Light Thunderstorm Rain':
							case 'Heavy Thunderstorm Rain':
							case 'Light Thunderstorm Rain Fog/Mist':
							case 'Heavy Thunderstorm Rain Fog and Windy':
							case 'Heavy Thunderstorm Rain Fog/Mist':
							case 'Light Thunderstorm Rain Haze':
							case 'Heavy Thunderstorm Rain Haze':
							case 'Light Thunderstorm Rain Fog':
							case 'Heavy Thunderstorm Rain Fog':
							case 'Thunderstorm Light Rain':
							case 'Thunderstorm Heavy Rain':
							case 'Thunderstorm Rain Fog/Mist':
							case 'Thunderstorm Light Rain Fog/Mist':
							case 'Thunderstorm Heavy Rain Fog/Mist':
							case 'Thunderstorm in Vicinity Fog/Mist':
							case 'Thunderstorm Showers in Vicinity':
							case 'Thunderstorm Haze in Vicinity':
							case 'Thunderstorm Light Rain Haze':
							case 'Thunderstorm Heavy Rain Haze':
							case 'Thunderstorm Fog':
							case 'Thunderstorm Light Rain Fog':
							case 'Thunderstorm Heavy Rain Fog':
							case 'Thunderstorm Hail':
							case 'Light Thunderstorm Rain Hail':
							case 'Heavy Thunderstorm Rain Hail':
							case 'Light Thunderstorm Rain Hail Fog/Mist':
							case 'Heavy Thunderstorm Rain Hail Fog/Hail':
							case 'Thunderstorm Showers in Vicinity Hail':
							case 'Light Thunderstorm Rain Hail Haze':
							case 'Heavy Thunderstorm Rain Hail Haze':
							case 'Light Thunderstorm Rain Hail Fog':
							case 'Heavy Thunderstorm Rain Hail Fog':
							case 'Thunderstorm Light Rain Hail':
							case 'Thunderstorm Heavy Rain Hail':
							case 'Thunderstorm Rain Hail Fog/Mist':
							case 'Thunderstorm Light Rain Hail Fog/Mist':
							case 'Thunderstorm Heavy Rain Hail Fog/Mist':
							case 'Thunderstorm in Vicinity Hail':
							case 'Thunderstorm in Vicinity Hail Haze':
							case 'Thunderstorm Haze in Vicinity Hail':
							case 'Thunderstorm Light Rain Hail Haze':
							case 'Thunderstorm Heavy Rain Hail Haze':
							case 'Thunderstorm Hail Fog':
							case 'Thunderstorm Light Rain Hail Fog':
							case 'Thunderstorm Heavy Rain Hail Fog':
							case 'Thunderstorm Small Hail/Snow Pellets':
							case 'Thunderstorm Rain Small Hail/Snow Pellets':
							case 'Light Thunderstorm Rain Small Hail/Snow Pellets':
							case 'Heavy Thunderstorm Rain Small Hail/Snow Pellets':
							  icon = 'Tstorm.svg';
							  break;
							case 'Snow':
							case 'Light Snow':
							case 'Heavy Snow':
							case 'Snow Showers':
							case 'Light Snow Showers':
							case 'Heavy Snow Showers':
							case 'Showers Snow':
							case 'Light Showers Snow':
							case 'Heavy Showers Snow':
							case 'Snow Fog/Mist':
							case 'Light Snow Fog/Mist':
							case 'Heavy Snow Fog/Mist':
							case 'Snow Showers Fog/Mist':
							case 'Light Snow Showers Fog/Mist':
							case 'Heavy Snow Showers Fog/Mist':
							case 'Showers Snow Fog/Mist':
							case 'Light Showers Snow Fog/Mist':
							case 'Heavy Showers Snow Fog/Mist':
							case 'Snow Fog':
							case 'Light Snow Fog':
							case 'Heavy Snow Fog':
							case 'Snow Showers Fog':
							case 'Light Snow Showers Fog':
							case 'Heavy Snow Showers Fog':
							case 'Showers Snow Fog':
							case 'Light Showers Snow Fog':
							case 'Heavy Showers Snow Fog':
							case 'Showers in Vicinity Snow':
							case 'Snow Showers in Vicinity':
							case 'Snow Showers in Vicinity Fog/Mist':
							case 'Snow Showers in Vicinity Fog':
							case 'Low Drifting Snow':
							case 'Blowing Snow':
							case 'Snow Low Drifting Snow':
							case 'Snow Blowing Snow':
							case 'Light Snow Low Drifting Snow':
							case 'Light Snow Blowing Snow':
							case 'Light Snow Blowing Snow Fog/Mist':
							case 'Heavy Snow Low Drifting Snow':
							case 'Heavy Snow Blowing Snow':
							case 'Thunderstorm Snow':
							case 'Light Thunderstorm Snow':
							case 'Heavy Thunderstorm Snow':
							case 'Snow Grains':
							case 'Light Snow Grains':
							case 'Heavy Snow Grains':
							case 'Heavy Blowing Snow':
							case 'Blowing Snow in Vicinity':
								icon = 'snow.svg';
								break;
							case 'Windy':
							case 'Breezy':
							case 'Fair and Windy':
							case 'A Few Clouds and Windy':
							case 'Partly Cloudy and Windy':
							case 'Mostly Cloudy and Windy':
							case 'Overcast and Windy':
								icon = 'windy-breezy.svg';
								break;
							case 'Showers in Vicinity':
							case 'Showers in Vicinity Fog':
							case 'Showers in Vicinity Fog/Mist':
							case 'Showers in Vicinity Haze':
								icon = 'rain-showers.svg';
								break;
							case 'Freezing Rain Rain':
							case 'Light Freezing Rain Rain':
							case 'Heavy Freezing Rain Rain':
							case 'Rain Freezing Rain':
							case 'Light Rain Freezing Rain':
							case 'Heavy Rain Freezing Rain':
							case 'Freezing Drizzle Rain':
							case 'Light Freezing Drizzle Rain':
							case 'Heavy Freezing Drizzle Rain':
							case 'Rain Freezing Drizzle':
							case 'Light Rain Freezing Drizzle':
							case 'Heavy Rain Freezing Drizzle':
								icon = 'freezing-rain-ice.svg';
								break;
							case 'Thunderstorm in Vicinity':
							case 'Thunderstorm in Vicinity Fog':
							case 'Thunderstorm in Vicinity Haze':
								icon = 'Tstorm.svg';
								break;
							case 'Light Rain':
							case 'Drizzle':
							case 'Light Drizzle':
							case 'Heavy Drizzle':
							case 'Light Rain Fog/Mist':
							case 'Drizzle Fog/Mist':
							case 'Light Drizzle Fog/Mist':
							case 'Heavy Drizzle Fog/Mist':
							case 'Light Rain Fog':
							case 'Drizzle Fog':
							case 'Light Drizzle Fog':
							case 'Heavy Drizzle Fog':
							case 'Rain':
							case 'Heavy Rain':
							case 'Rain Fog/Mist':
							case 'Heavy Rain Fog/Mist':
							case 'Rain Fog':
							case 'Heavy Rain Fog':
								icon = 'light-rain-drizzle.svg';
								break;
							case 'Funnel Cloud':
							case 'Funnel Cloud in Vicinity':
							case 'Tornado/Water Spout':
								icon = 'funnel-cloud.svg';
								break;
							case 'Dust':
							case 'Low Drifting Dust':
							case 'Blowing Dust':
							case 'Sand':
							case 'Blowing Sand':
							case 'Low Drifting Sand':
							case 'Dust/Sand Whirls':
							case 'Dust/Sand Whirls in Vicinity':
							case 'Dust Storm':
							case 'Heavy Dust Storm':
							case 'Dust Storm in Vicinity':
							case 'Sand Storm':
							case 'Heavy Sand Storm':
							case 'Sand Storm in Vicinity':
								icon = 'dust.svg';
								break;
							case 'Haze':
								icon = 'haze.svg';
								break;
						}
		      	$('#icon').html('<img src="/themes/usda/js/farmers/weather-icons/' + icon + '"/>');

		      	$('#condition').html(obs);

		      	var lo = weather.data.temperature['1'] + '&#176;';
		      	var hi = weather.data.temperature['0'] + '&#176;';

		      	//console.log('hi: ' + hi);
		      	//console.log('lo: ' + lo);

		      	var tempLabelone = weather.time.tempLabel['0'];
		      	//var tempLabeltwo = weather.time.tempLabel['1'];

		      	if (tempLabelone === 'High') {
  		      	$('#hiandlow').html(hi + '/' + lo + ' high/low');
		      	} else {
  		      	$('#hiandlow').html(lo + '/' + hi + ' high/low');
		      	}

		      	$('#time').html(weather.currentobservation.Date);

		      	var windD = parseInt(weather.currentobservation.Windd);
		      	var direction = '';
		      	var windString = '';
						if (windD > 340 && windD < 29) {
							direction = 'N';
						} else if(windD > 30 && windD < 69) {
							direction = 'NE';
						} else if(windD > 70 && windD < 129) {
							direction = 'E';
						} else if(windD > 130 && windD < 159) {
							direction = 'SE';
						} else if(windD > 160 && windD < 200) {
							direction = 'S';
						} else if(windD > 201 && windD < 240) {
							direction = 'SW';
						} else if(windD > 241 && windD < 290) {
							direction = 'W';
						} else if(windD > 291 && windD < 339) {
							direction = 'NW';
						}
						//console.log(windD);
						var windS = parseInt(weather.currentobservation.Winds);

						if (windS <= 1) {
							windString = 'Calm';
						} else {
							windString = direction + ' ' + windS + ' mph winds';
						}
		      	$('#wind-speed').html(windString);
		        $('#new-weather').fadeIn().css('display','table');
		      });
		    });
			});
			$('#zip').keypress(function(e){
				if(e.which == 13){ // Enter key pressed
					$('#weather-search').click(); // Trigger search button click event
				}
			});
			$('#change').click(function(){
				$('#new-weather').fadeOut(200);
				$('#zip').focus().val('');
			});
      /*
      $('.carousel').slick({
        adaptiveWidth: true,
        adaptiveHeight: true
      });
      $('.card-carousel').slick({
        adaptiveWidth: true,
        adaptiveHeight: true
      });
      $('.blog-carousel').slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        infinite: true,
        responsive: [
          {
            breakpoint: 559,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
      });
      $('.image-carousel').slick({
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1
      });
      */
      $('.accordion-grid').each(function() {
      	$(this).find('.accordion').matchHeight({byRow : false});
			});
			$('.accordion-block-wrap button').click(function(){
  		  var textLess = $(this).find('a');
        textLess.toggleClass('active');
        if(textLess.hasClass('active')){
          textLess.text('Show Less');
        } else {
          textLess.text('Show More');
        }

      });
    }
  };
  Drupal.behaviors.farmersLearnMore = {
    attach: function (context, settings) {
      var learnMoreElement = $('.learn-more-farmers .learn-more-farmers__trigger');
      if (learnMoreElement.length > 0) {
        var parentLearnMore = $(learnMoreElement.parents('.learn-more-farmers')[0]);
        var dropdown = parentLearnMore.find('.learn-more-farmers__dropdown');

        var farmersLearnMoreStyles = function (dropdown, hidden) {
          if (hidden === true) {
            dropdown.css('height', '0');
          } else {
            dropdown.css('height', dropdown.children('.learn-more-farmers__content').outerHeight(true) + 'px');
          }
        };

        var farmersLearnMore = function (target) {
          if (parentLearnMore.hasClass('active')) {
            parentLearnMore.removeClass('active');
            farmersLearnMoreStyles(dropdown, true);
          } else {
            parentLearnMore.addClass('active');
            farmersLearnMoreStyles(dropdown, false);
          }
        };

        $(window).resize(function() {
          if (parentLearnMore.hasClass('active')) {
            farmersLearnMoreStyles(dropdown, false);
          }
        });

        learnMoreElement.once('farmersLearnMore').on('click', function (event) {
          farmersLearnMore(event.currentTarget);
        });
			}
    }


  };
  Drupal.behaviors.farmersAccordion = {
    attach: function (context, settings) {
      $('.accordion-grid', context).once('farmersAccordion').append('<div class="accordion-details"></div>');
      $('.accordion-details').once('farmersAccordion').on('click', function (event) {
        event.stopPropagation();
      });
      var accordionGridElements = $('.accordion-grid');
      for (var i = 0; i < accordionGridElements.length; i++) {
        var accordionGrid = $(accordionGridElements[i]);
        var accordionElements = $(accordionGrid).find('.accordion');
        if (accordionElements.length > 0) {
          var accordionStyle = function (accordionClicked, accordionDetailElement, set) {
            var parentAccordionGrid = $($(accordionDetailElement).parents('.accordion-grid')[0]);
            var parentAccordionRow = parentAccordionGrid.find('.accordion-row');
            if (set === true) {
              accordionDetailElement.css('top', accordionClicked.outerHeight(false) + 'px');
              if (accordionClicked.parent().width() >= accordionClicked.outerWidth()) {
                accordionDetailElement.css('width', accordionClicked.parent().width() + 'px');
              } else {
                accordionDetailElement.css('width', parentAccordionGrid.innerWidth() + 'px');
              }
              accordionDetailElement.css('left', '-' + (accordionClicked.offset().left - parentAccordionRow.offset().left) + 'px');
              accordionDetailElement.css('height', '0');
              parentAccordionGrid.find('.accordion').css('margin-bottom', '');
              accordionDetailElement.css('height', $(accordionDetailElement).children().outerHeight(true) + 10 + 'px');
              accordionClicked.css('margin-bottom', $(accordionDetailElement).children().outerHeight(true) + 30 + 'px');
            } else {
              parentAccordionGrid.find('.accordion').css('margin-bottom', '');
              accordionDetailElement.css('height', '0');
            }
          };

          var animating = false;
          var postAnimation;
          var testFunction = function (clickedAccordion, accordionDetails) {
            clickedAccordion.removeClass('pre-active');
            clickedAccordion.addClass('active');
            accordionDetails.appendTo(clickedAccordion);
            accordionDetails.html(clickedAccordion.find('.accordion-bellows').html()).addClass('active');
            accordionStyle(clickedAccordion, accordionDetails, true);
            animating = false;
          };

          var accordionBehavior = function (target) {
            var clickedAccordion = $(target);
            var parentAccordionGrid = $($(target).parents('.accordion-grid')[0]);
            var accordionDetails = parentAccordionGrid.find('.accordion-details');
            if (clickedAccordion.hasClass('active')) {
              clickedAccordion.removeClass('active').addClass('last-active');
              accordionDetails.removeClass('active');
              accordionStyle(clickedAccordion, accordionDetails, false);
            } else if (clickedAccordion.hasClass('last-active')) {
              clickedAccordion.addClass('active');
              accordionDetails.addClass('active');
              clickedAccordion.removeClass('last-active');
              accordionStyle(clickedAccordion, accordionDetails, true);
            }  else if (accordionDetails.hasClass('active')) {
              parentAccordionGrid.find('.accordion').removeClass('active');
              parentAccordionGrid.find('.accordion').removeClass('pre-active');
              parentAccordionGrid.find('.accordion').removeClass('last-active');
              clickedAccordion.addClass('pre-active');
              accordionStyle(clickedAccordion, accordionDetails, false);
              if (animating === true) {
                clearTimeout(postAnimation);
              }
              animating = true;
              postAnimation = setTimeout(function() {
                testFunction(clickedAccordion, accordionDetails);
              }, 425);
            } else {
              parentAccordionGrid.find('.accordion').removeClass('active');
              parentAccordionGrid.find('.accordion').removeClass('last-active');
              accordionStyle(clickedAccordion, accordionDetails, false);
              clickedAccordion.addClass('active');
              accordionDetails.appendTo(clickedAccordion);
              accordionDetails.html(clickedAccordion.find('.accordion-bellows').html()).addClass('active');
              accordionStyle(clickedAccordion, accordionDetails, true);
            }
          };

          accordionElements.once('farmersAccordion').on('click', function (event) {
            accordionBehavior(event.currentTarget);
          });

          $(window).resize(function() {
            var accordionDetailSet = $('.accordion-details.active');
            var j;
            for (j = 0; j < accordionDetailSet.length; j++) {
              var accordionDetails = $(accordionDetailSet[j]);
              if (accordionDetails.hasClass('active')) {
                var parentAccordionGrid = $(accordionDetails.parents('.accordion-grid')[0]);
                var clickedAccordion = parentAccordionGrid.find('.accordion.active');
                if (clickedAccordion.length === 0) {
                  clickedAccordion = parentAccordionGrid.find('.accordion.last-active');
                }
                if (accordionDetails.length > 0 && clickedAccordion.length > 0) {
                  accordionStyle(clickedAccordion, accordionDetails, true);
                }
              }
            }
          });
        }
      }
    },
  };

})(jQuery, Drupal);;
