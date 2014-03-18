define([
  'backbone',
  '../models/DatatableModel'
], function(
  Backbone,
  DatatableModel
) {
  'use strict';

  return Backbone.Collection.extend({
    model: DatatableModel
  });
});