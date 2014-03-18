/*global _*/

define([
  'backbone',
  'stache!datatable',
  './CollectionView',
  '../collections/ColumnCollection',
  'includes/utils'
], function(
  Backbone,
  baseTemplate,
  CollectionView,
  ColumnCollection,
  utils
) {
  'use strict';

  return Backbone.View.extend({
    initialize: function(options) {
      this.options = options || {};
      this.el = this.options.el;
      delete this.options.el;
      this.createColumns();
      this.collectionView = new CollectionView(this.options);
      this.listenTo(this.collectionView.collection, 'end', this.finishedLoad);
      this.listenTo(this.collectionView.collection, 'no-data', this.noData);
      this.render();
    },
    createColumns: function() {
      this.options.schema = new ColumnCollection(this.options.schema);
    },
    finishedLoad: function() {
      this.trigger('end');
    },
    noData: function() {
      this.trigger('no-data');
    },
    render: function() {
      this.$el.append(baseTemplate(this.options));
      this.trigger('loading');
      $('#dynamic-table-content', this.el).html(this.collectionView.render().el);
      return this;
    },
    events: {
      'click th.sortable': 'sortItems',
      'keydown input#quickSearch': 'showLoading',
      'keyup input#quickSearch': 'quickSearch',
      'search input#quickSearch': 'quickSearch',
      'click input#select-all': 'selectAll',
      'click button.generate-csv': 'generateCsv',
      'click input.select-checkbox': 'untickSelectAll',
      'drag th.draggable': 'dragging',
      'dragover th.draggable': 'dragover',
      'drop th.draggable': 'dropping',
      'dragleave th': 'dragLeft'
    },
    selectAll: function(event) {
      this.allSelected = event.target.checked;
      this.trigger('allSelected', this.allSelected);
      $('input.select-checkbox').prop('checked', this.allSelected);
    },
    untickSelectAll: function() {
      this.allSelected = false;
      this.trigger('allSelected', false);
      $('input#select-all', this.el).prop('checked', false);
    },
    sortItems: function(event) {
      var self = this;
      this.trigger('loading');
      var $el = $(event.target);
      if ($el.prop('tagName') === 'DIV') {
        $el = $el.parent('th');
      }
      var orderBy = $el.attr('data-ref'),
        order = $el.attr('aria-sort') === 'ascending' ? 'DESC' : 'ASC',

        value = $('#quickSearch', this.el).val();
      this.collectionView.collection.fetch({
        data: {
          id: this.options.refId,
          orderBy: orderBy,
          order: order,
          value: value,
          limit: 20,
          offset: 0
        },
        success: function(data) {
          $('th.sortable').not($el).removeAttr('aria-sort').removeClass('sorting_desc sorting_asc');
          if ($el.attr('aria-sort') === 'ascending') {
            $el.attr('aria-sort', 'descending').addClass('sorting_desc').removeClass('sorting_asc');
          } else {
            $el.attr('aria-sort', 'ascending').addClass('sorting_asc').removeClass('sorting_desc');
          }
          if (data.length) {
            self.collectionView.collection.trigger('end');
          } else {
            self.collectionView.collection.trigger('no-data');
          }
        },
        reset: true
      });
    },
    dragging: function(e) {
      var target = $(e.target);
      this.draggingColumn = target;
    },
    dropping: function(e) {
      var target = $(e.target);
      var drag = this.draggingColumn.attr('data-ref');
      var drop = target.attr('data-ref');
      this.trigger('reorderColumns', drag, drop, this.options.schema);
      $('th').removeClass('dragover');
    },
    dragover: function(e) {
      e.preventDefault();
      var target = $(e.target);
      target.addClass('dragover');
    },
    dragLeft: function(e) {
      e.preventDefault();
      var target = $(e.target);
      target.removeClass('dragover');
    },
    reorderColumns: function(schema) {
      var orderBy = $('th[aria-sort]');
      var order = orderBy.attr('aria-sort');
      var value = $('input#quickSearch').val();

      this.options.schema = schema;
      this.collectionView.options.schema = schema;

      var $th = $('th.draggable');
      var controls = $('div.toggle-single');
      var array = [];
      var anotherArray = [];
      $th.each(function() {
        var $this = $(this);
        schema.each(function(item, j) {
          if ($this.attr('data-ref') === item.get('modelRef')) {
            array[j] = $this;
          }
        });
      });
      controls.each(function() {
        var $this = $(this);
        schema.each(function(item, l) {
          if ($this.children('input').attr('data-column') === item.get('modelRef')) {
            anotherArray[l] = $this;
          }
        });
      });
      $th.detach();
      controls.detach();
      $.each(array, function(i, item) {
        if ($('th.select-all').length) {
          $('th.select-all').before(item);
        } else {
          $('table.backbone-datagrid-head thead tr').append(item);
        }

      });
      $.each(anotherArray, function(i, item) {
        $('div#show-hide-all-buttons').before(item);
      });

      this.collectionView.collection.fetch({
        data: {
          id: this.options.refId,
          orderBy: orderBy.attr('data-ref'),
          order: order === 'ascending' ? 'ASC' : 'DESC',
          value: value,
          offset: 0,
          limit: 20
        },
        reset: true

      });

    },
    timeouts: [],
    quickSearch: function() {
      this.trigger('loading');
      for (var i = 0; i < this.timeouts.length; i++) {
        clearTimeout(this.timeouts[i]);
      }
      var self = this;
      this.timeouts.push(setTimeout(function() {
        var value = $('input#quickSearch', this.el).val() || '',
          col = $('th[aria-sort]'),
          orderBy = col.attr('data-ref'),
          order = col.attr('aria-sort') === 'ascending' ? 'ASC' : 'DESC';

        self.collectionView.collection.fetch({
          data: {
            id: self.options.refId,
            orderBy: orderBy,
            order: order,
            value: value,
            limit: 20,
            offset: 0
          },
          reset: true,
          success: function() {
            self.collectionView.collection.trigger('end');
            self.collectionView.updateNumbers(true, value);
          }
        });
      }, 500));
      return false;
    },
    generateCsv: function() {
      var self = this;
      this.trigger('loading');
      var amountSelected = $('input.select-checkbox, input#select-all').filter(':checked').length;
      if (this.allSelected || amountSelected === 0) {
        $.ajax({
          url: self.options.apiPage,
          method: 'GET',
          data: {
            id: self.options.refId,
            orderBy: self.options.schema.find(function(item) {
              return item.get('isDefault') === true;
            }).get('modelRef'),
            order: 'ASC',
            value: '',
            offset: 0
          },
          success: function(data) {
            self.downloadCsv(data);
          }
        });
      } else {
        var data = [];
        $('input.select-checkbox:checked').each(function() {
          var model = {};
          var $this = $(this);
          var $row = $this.parents('td').parent('tr');
          $row.children('td').not('.select-checkbox').each(function() {
            var $this = $(this);
            model[$this.attr('data-ref')] = $this.attr('data-content');
          });
          data.push(model);
        });
        this.downloadCsv(data);
      }
    },
    downloadCsv: function(obj) {
      var self = this;
      var allowed = [];
      $('.backbone-datagrid-head th:visible').not('.select-all').each(function() {
        var $this = $(this);
        allowed.push($this.attr('data-ref'));
      });
      var headers = new Backbone.Collection(self.options.schema.toJSON());
      var filtered = headers.filter(function(item) {
        return allowed.indexOf(item.get('modelRef')) !== -1;
      });
      headers.reset(filtered);
      headers = headers.pluck('title');
      var csvContent = [];
      csvContent.push(headers);
      for (var i = 0; i < obj.length; i++) {
        var row = [];
        for (var k = 0; k < allowed.length; k++) {
          for (var j in obj[i]) {
            if (allowed[k] === j) {
              //row.push(obj.models[i][j]);
              var item = obj[i][j];
              var escaped = typeof item === 'object' ? obj[i][j].join(', ').split('"').join('""') : obj[i][j].split('"').join('""');
              row.push(escaped);
            }
          }
        }
        csvContent.push(row);
      }

      var string = '';

      for (var x = 0; x < csvContent.length; x++) {
        string += _(csvContent[x]).map(function(column) {
          return '"' + column.toString().replace('"', '""') + '"';
        }).join(',');

        string += '\n';
      }

      var encodedData = window.btoa(unescape(encodeURIComponent(string))),
        file = 'data:text/csv;base64,' + decodeURIComponent(escape(encodedData)),
        name = ($('h1').text().toLowerCase()).split(' ').join('_') + '.csv';

      utils.downloadWithName(file, name);
      this.collectionView.collection.trigger('end');
    },
    cancel: function() {
      $(this.el).undelegate('th', 'drag');
      $(this.el).undelegate('th', 'dragover');
      $(this.el).undelegate('th', 'drop');
      $(this.el).undelegate('th', 'dragleave');
      $(this.el).undelegate('th.sortable', 'click');
    },
    resizeTable: function(fitToWindow) {
      this.$el.height('');
      var contentArea = $('div#cmp-body-content'),
        div = $('div.scrolling-table-body', this.el),
        contentInnerHeight = contentArea.height(),
        contentOffset = contentArea.offset(),
        offset = div.offset();
      offset.top = offset.top - contentOffset.top;
      offset.left = offset.left - contentOffset.left;
      if (fitToWindow) {
        div.height(contentInnerHeight - offset.top - 32);
      } else {
        div.height(600);
      }
    },
    destroy: function() {
      this.undelegateEvents();
      this.$el.removeData().unbind();
      this.$el.empty();
    },
    setHeight: function() {
      var height = this.$el.outerHeight();
      this.$el.height(height);
    },
    removeSetHeight: function() {
      this.$el.height('auto');
    }
  });
});