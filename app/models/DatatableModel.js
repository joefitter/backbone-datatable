/*global _*/

define([
  'backbone'
], function(
  Backbone
) {
  'use strict';

  return Backbone.Model.extend({
    parse: function(data) {
      var self = this,
        rtn = data;
      if (this.collection.options.schema) {
        rtn = {};
        this.schema = this.collection.options.schema;
        var cols = this.schema.pluck('modelRef');
        rtn.id = data.id[0] ? data.id[0] : data.id;
        _.each(cols, function(item) {
          var value = data[item];
          if (!Array.isArray(value)) {
            value = [value];
          }
          rtn[item] = [];
          _.each(value, function(thing) {
            rtn[item].push({
              formatted: self.formatData(thing, item, rtn.id),
              raw: thing
            });
          });

        });
      }
      return rtn;
    },
    formatData: function(data, modelRef, id) {
      var formatter = this.schema.find(function(item) {
        return item.get('modelRef') === modelRef;
      }).get('formatter');
      if (formatter) {
        data = formatter(data, id);
      }
      return data;
    },
  });
});