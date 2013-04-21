 
var Crafty = require('./lib/crafty');

exports.FPS = function( el, maxValue )
{
  var fps = Crafty.e( '2D, Canvas, FPS' );
  fps.attr( { maxValue: maxValue } )
  Crafty.bind( 'MessureFPS', function( fps ) {
    el.innerHTML = fps.value;
  } );
};