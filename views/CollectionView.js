/*global _*/

define([
  'backbone',
  'stache!collection',
  '../collections/Collection',
  './ModelView'
], function(
  Backbone,
  collectionTemplate,
  Collection,
  ModelView
) {
  'use strict';

  return Backbone.View.extend({
    className: 'scrolling-table-body',
    initialize: function(options) {
      this.options = options || {};
      var self = this;
      this.collection = new Collection();
      this.collection.url = this.options.apiPage;
      this.collection.options = this.options;
      this.collection.fetch({
        data: {
          id: self.options.refId,
          orderBy: this.options.schema.find(function(item) {
            return item.get('isDefault');
          }).get('modelRef'),
          order: 'ASC',
          value: '',
          offset: 0,
          limit: 20
        },
        success: function(data) {
          if (data.length) {
            self.updateNumbers(false);
            self.collection.trigger('end');
          } else {
            self.destroy();
            self.undelegateEvents();
            self.collection.trigger('no-data');
          }
        }
      });
      this.collection.on('add', this.addItem, this);
      this.collection.on('reset', this.resetView, this);
    },
    render: function() {
      this.$el.html(collectionTemplate());
      this.delegateEvents();
      return this;
    },
    events: {
      'scroll': 'fetchTenMore'
    },
    i: 0,
    addItem: function(item) {
      var modelView = new ModelView({
        model: item,
        i: this.i++,
      });
      _.extend(modelView.options, this.options);
      modelView.trigger('done');
      $('tbody', this.el).append(modelView.render().el);
    },
    resetView: function() {
      this.i = 0;
      $('tbody', this.el).empty();
      var self = this;
      _.each(this.collection.models, function(item) {
        self.addItem(item);
      });
    },
    updateNumbers: function(filtered, value) {
      var foot = $('.static-table-footer td'),
        from = foot.find('#showing-from'),
        to = foot.find('#showing-to'),
        total = foot.find('#showing-total');
      if (!filtered) {
        from.html(this.collection.models.length ? 1 : 0);
        to.html(this.collection.models.length);
        if (parseInt(total.html(), 10) === 0) {
          total.html(this.options.totalResults);
        }
      } else {
        var self = this;
        $.ajax({
          url: this.options.countApiUrl,
          method: 'POST',
          data: {
            id: self.options.refId,
            value: value
          },
          success: function(data) {
            from.html(self.collection.models.length ? 1 : 0);
            to.html(self.collection.models.length);
            if (data < self.options.totalResults) {

              $('.static-table-footer td').find('#showing-total').html(data);
              $('span#filteredFrom').html(' (filtered from ' + self.options.totalResults + ' total entries)');
            } else {
              $('span#filteredFrom').empty();
              $('.static-table-footer td').find('#showing-total').html(self.options.totalResults);
            }
          }
        });
      }
    },
    resetNumbers: function() {
      var foot = $('.static-table-footer td'),
        from = foot.find('#showing-from'),
        to = foot.find('#showing-to'),
        total = foot.find('#showing-total');
      $.each([from, to, total], function(index, value) {
        value.html('0');
      });
    },
    fetchTenMore: function(event) {
      var self = this,
        $this = $(event.target),
        scrollTop = $this.scrollTop(),
        height = $this.height(),
        totalHeight = $this[0].scrollHeight,
        offset = this.collection.models.length,
        col = $('th[aria-sort]'),
        orderBy = col.attr('data-ref'),
        order = col.attr('aria-sort') === 'ascending' ? 'ASC' : 'DESC',
        limit = 10,
        value = $('input#quickSearch').val();
      if (((scrollTop + height) / totalHeight) * 100 >= 90) {
        this.collection.trigger('loading');
        this.collection.fetch({
          data: {
            id: self.options.refId,
            order: order,
            orderBy: orderBy,
            value: value,
            offset: offset,
            limit: limit
          },
          success: function() {
            self.updateNumbers(false);
            self.collection.trigger('end');
          },
          remove: false
        });
      }
    },
    destroy: function() {
      this.remove();
      this.undelegateEvents();
    }
  });
});