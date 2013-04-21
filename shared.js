
module.exports = {

  randomOffscreenCoordinates: function(viewport, size) {
    var angle = Math.random() * 2 * Math.PI,
        radius = Math.max(viewport.width / 2, viewport.height / 2)
               + Math.max(size.w, size.h);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }

};