define([
  'backbone'
], function(
  Backbone
) {
  'use strict';

  return Backbone.Model.extend({
    getAttr: function() {
      var self = this;
      return function(val) {
        return self.get(val);
      };
    }
  });
});