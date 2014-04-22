/*global _*/

define([
  'backbone',
  '../models/ColumnModel'
], function(
  Backbone,
  ColumnModel
) {
  'use strict';

  return Backbone.Collection.extend({
    model: ColumnModel,
    url: 'api/getColumnsByInstance',
    splice: function(index, howMany) {
      var args = _.toArray(arguments).slice(2).concat({
        at: index
      }),
        removed = this.models.slice(index, index + howMany);
      this.remove(removed);
      this.add.apply(this, args);
      return removed;
    }
  });
});