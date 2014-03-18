/*global _*/

define([
  'backbone',
  'stache!model',
  'includes/tooltip/views/BaseView'
], function(
  Backbone,
  modelTemplate,
  Tooltip
) {
  'use strict';

  return Backbone.View.extend({
    initialize: function(options) {
      this.options = options || {};
      this.on('done', this.configure, this);
    },
    configure: function() {
      var self = this;
      if (this.model.get('Href-Lang')) {
        this.formatHrefLang(this.model.get('Href-Lang'));
      }
      if (this.hreflang) {
        this.displayHrefLang();
      }
      $(window).bind('resize', _.bind(this.resizeWindow, this));
      this.model.collection.on('col-toggle', this.resizeWindow, this);
      this.sortedModel = _.map(this.model.attributes, function(item, key) {
        if (key !== 'id') {
          var value = _.map(item, function(thing) {
            return thing.raw;
          });
          var modelRef = key,
            schema = self.options.schema.find(function(item) {
              return item.get('modelRef') === key;
            }),
            showing = schema.get('showing'),
            escaped = schema.get('formatter') === undefined,
            list = Array.isArray(value) && value.length > 1,
            hreflang = modelRef === 'Href-Lang',
            display = item[0] ? item[0].formatted : null;
          return {
            value: value,
            modelRef: modelRef,
            showing: showing,
            escaped: escaped,
            list: list,
            hreflang: hreflang,
            display: display
          };
        }
      });
      this.sortedModel = _.filter(this.sortedModel, function(item) {
        return item !== undefined;
      });
    },
    tagName: 'tr',
    className: 'main',
    render: function() {
      this.$el.html(modelTemplate(this));
      this.on('load', this.checkHrefLang, this);
      if (this.options.i % 2 === 0) {
        this.$el.addClass('odd');
      }
      if (!this.model.collection.options.csvDownload) {
        this.changeWidth();
      }
      return this;
    },
    events: {
      'click a.next-item, a.prev-item': 'nextItem',
      'mouseenter div.hreflang, td': 'showTooltip'
    },
    resizeWindow: function() {
      if (this.hreflang) {
        var elem = $('div.scroll-inner', this.el);
        elem.empty();
        this.displayHrefLang(this.step, elem);
        elem.html(this.hreflanghtml);
      }
    },
    showTooltip: function(event) {
      var $el = $(event.target).prop('tagName') === 'A' ? $(event.target).parents('td') : $(event.target);
      var eleWidth = $el.outerWidth(),
        content = $el.attr('data-content') || '';
      if (content) {
        var span = $('<span></span>').css({
          display: 'none',
          whiteSpace: 'nowrap',
          fontWeight: 'bold'
        });
        span.appendTo($('body')).text(content);
        var textWidth = span.width();
        span.remove();
        eleWidth = $el.width();
        if (textWidth > eleWidth || $el.hasClass('hreflang')) {
          if (!$el.data('activeTooltip')) {
            new Tooltip({
              target: $el,
              hoverTrigger: true,
              text: $el.attr('data-content'),
              rootElem: $('body'),
              moveUp: $el.hasClass('hreflang') ? 0 : 12
            });
          }
        }
      }
    },
    checkHrefLang: function() {
      if (this.hreflangnum < this.hreflang.length) {
        this.$el.find('td[modelRef="Href-Lang"]').attr('data-has-next', true);
      }
    },
    formatHrefLang: function(arr) {
      if (arr[0].formatted !== null && arr[0].raw !== null && arr[0].formatted !== undefined && arr[0].raw !== undefined) {
        var res = [];
        _.each(arr, function(item) {
          var $el, tmp = {};
          try {
            $el = $(item.raw);
            tmp.hreflang = $el.attr('hreflang') || 'Invalid';
            tmp.href = tmp.hreflang === 'Invalid' ? item.raw : $el.attr('href');
          } catch (e) {
            $el = item.raw;
            tmp.href = $el;
            tmp.hreflang = 'Invalid';
          }
          res.push(tmp);
        });
        this.hreflang = res;
        return res;
      } else {
        this.hreflang = null;
        return false;
      }
    },
    displayHrefLang: function(step, elem) {

      var arr = this.hreflang;
      var w = $('th[data-ref="Href-Lang"]').width();
      step = step || 1;
      var num = Math.floor((w) / 56) * step < arr.length ? Math.floor((w) / 56) * step : arr.length;
      var numShowing = Math.floor((w) / 56);

      step = Math.ceil(num / numShowing);
      if (this.loaded) {
        $('span.hreflang-holder', this.el).width(56 * numShowing);
        $('div.scroll-inner', this.el).width(56 * numShowing);
        $('div.scroll-inner', this.el).css({
          marginLeft: '-' + (56 * numShowing) * (step - 1)
        });
      }


      var rtn = '';
      for (var i = 0; i < (num); i++) {
        var className = arr[i].hreflang === 'Invalid' ? 'invalid' : 'valid';
        rtn += '<div class="hreflang ' + className + '" data-content="' + this.htmlEncode(arr[i].href) + '" data-index="' + i + '">' + arr[i].hreflang + '</div>';
      }

      this.numPerCell = numShowing;
      this.hreflangindex = num;
      this.hreflangnum = num;
      this.hreflanghtml = rtn;
      this.step = step;
      if (0 < Math.ceil(this.hreflang.length / this.numPerCell) - 1) {
        this.hreflangHasNext = true;
      } else {
        this.hreflangHasNext = false;
      }
      if (this.loaded) {
        elem = elem.parents('td');
        elem.attr('data-index', step - 1);
        this.updateArrows(elem, elem.attr('data-index'));
      }
      this.loaded = true;
    },
    htmlEncode: function(string) {
      var result = $('<div/>').text(string).html();
      result = result.replace(/'/g, '&quot;');
      result = result.replace(/'/g, '&apos;');
      return result;
    },
    nextItem: function(event) {
      var elem = $(event.target).parent('a');
      var direction = elem.hasClass('prev-item') ? 'prev' : 'next';
      var td = elem.parent('td');
      var col = td.attr('data-ref');
      var data = this.model.get(col);
      var value = td.find('span');
      var index = parseInt(td.attr('data-index'), 10);
      if (col !== 'Href-Lang') {
        if (direction === 'next') {
          if (data.length - 1 > index) {
            value.text(data[index + 1].formatted);
            td.attr('data-index', index + 1);
            if (data.length <= index + 2) {
              td.attr('data-has-next', false);
            }
            if (index >= 0) {
              td.attr('data-has-prev', true);
            }
          } else {
            td.attr('data-has-next', false);
            if (index >= 0) {
              td.attr('data-has-prev', true);
            }
          }
        } else {
          if (index > 0) {
            value.text(data[index - 1].formatted);
            td.attr('data-index', index - 1);
            if (index <= 1) {
              td.attr('data-has-prev', false);
              if (index < data.length + 1) {
                td.attr('data-has-next', true);
              }
            } else {
              td.attr('data-has-prev', true);
              if (index < data.length + 1) {
                td.attr('data-has-next', true);
              }
            }
          }
        }
      } else if (col === 'Href-Lang') {
        this.scrollHrefLang(td, direction, index);
      }
      return false;
    },
    scrollHrefLang: function(td, dir, i) {
      var arr = this.hreflang,
        holder = td.find('span.hreflang-holder'),
        width = holder.width(),
        inner = holder.find('div.scroll-inner');
      holder.width(width);
      inner.width(width);


      if (dir === 'next') {
        if (i < Math.ceil(arr.length / this.numPerCell) - 1) {
          inner.stop();
          this.showNextThree(inner);
          inner.animate({
            marginLeft: '-=' + width + 'px'
          }, 500);
          td.attr('data-index', ++i);
          this.updateArrows(td, i);
          this.step++;
        }
      } else if (dir === 'prev') {
        if (i > 0) {
          inner.stop();
          inner.animate({
            marginLeft: '+=' + width + 'px'
          }, 500);

          td.attr('data-index', --i);
          this.updateArrows(td, i);
          this.step--;
        }

      }
    },
    appendOne: function(inner) {
      var arr = this.hreflang,
        last = inner.children('div').last(),
        l = arr.length,
        i = this.hreflangindex;
      if (l > i) {
        var className = arr[i].hreflang === 'Invalid' ? 'invalid' : 'valid';
        last.after($('<div />', {
          class: 'hreflang ' + className,
          'data-content': arr[i].href,
          html: arr[i].hreflang
        }));
        this.hreflangindex++;
      }
    },
    showNextThree: function(inner) {
      var arr = this.hreflang,
        l = arr.length,
        i = this.hreflangindex,
        n = this.hreflangnum,
        num = n + i <= l ? n : l - i;
      if (l > i) {
        var x = i;
        for (i; i < x + num; i++) {
          var className = arr[i].hreflang === 'Invalid' ? 'invalid' : 'valid';
          $('<div />', {
            class: 'hreflang ' + className,
            'data-content': arr[i].href,
            html: arr[i].hreflang,
          }).appendTo(inner);
        }
        this.hreflangindex = i;
      }
    },
    updateArrows: function(td, i) {
      if (i < Math.ceil(this.hreflang.length / this.numPerCell) - 1) {
        td.attr('data-has-next', true);
      } else {
        td.attr('data-has-next', false);
      }
      if (i > 0) {
        td.attr('data-has-prev', true);
      } else {
        td.attr('data-has-prev', false);
      }
    },
    changeWidth: function() {
      var $td = $('td', this.el).last(),
        $ref = $('td', this.el).first();
      setTimeout(function() {
        $td.width($ref.width() - 10);
      }, 1);
    }
  });
});