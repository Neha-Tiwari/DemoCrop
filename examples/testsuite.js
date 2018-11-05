// prepare base perf object
if (typeof window.performance === 'undefined') {
  window.performance = {};
}

if (!window.performance.now) {
  var nowOffset = Date.now();

  if (performance.timing && performance.timing.navigationStart) {
    nowOffset = performance.timing.navigationStart;
  }

  window.performance.now = function now() {
    return Date.now() - nowOffset;
  };
}

var processed = {};
//original
//  var options = { debug: true, width: 250, height: 250 };

//for images with less than original size
// var options = { debug: true, width: 130, height: 140 };

//for images with more than original size
var options = { debug: true, width: 180, height: 200 };

$.getJSON('images/images.json', function(images) {
  $('body').append(
    images.map(function(image) {
      return $('<div>')
        .append($('<img>').attr('src', image.url))
        .append(
          $('<div class=testsuite-image-title>')
            .append(
              $('<a>')
                .text(image.name)
                .attr('href', image.href)
            )
            .append(
              $('<span class=test-suite-image-attribution>').text(
                ' by ' + image.attribution
              )
            )
            .append(
              '  <br/> You can try it out sample image using the <a href=' +
                'testbed.html' +
                '> Sample Image</a></p>'
            )
        );
    })
  );

  var totalTime = 0;
  var totalmpix = 0;
  var totalCrops = 0;

  $('img').each(function() {
    $(this).load(function() {
      window.setTimeout(
        function() {
          var img = this;
          console.log('img', img);
          if (processed[img.src]) return;
          processed[img.src] = true;
          var t = performance.now();
          smartcrop.crop(img, options, function(result) {
            // console.log('result', result);
            totalTime += (performance.now() - t) / 1e3;
            totalmpix += (img.naturalWidth * img.naturalHeight) / 1e6;
            totalCrops++;
            $('#perf').text(
              'Processed ' +
                totalCrops +
                // console.log("totalCrops:" + totalCrops) +
                ' Images, with Speed ' +
                Math.round((totalTime * 1000) / totalCrops) +
                ' ms/image, & Image Sensing time ' +
                Math.round((100 * totalmpix) / totalTime) / 100 +
                ' mega pixel/s'
            );
            // console.log("result", result);
            var crop = result.topCrop;
            var canvas = $('<canvas className=' + 'AfterCrop' + '>')[0];
            var ctx = canvas.getContext('2d');
            canvas.width = options.width;
            canvas.height = options.height;
            ctx.drawImage(
              img,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              0,
              0,
              canvas.width,
              canvas.height
            );
            console.log('result', result);

            $(img)
              .after(canvas)
              .after(debugDraw(result, true));
            //  .parent()
            //  .append($('<pre>').text(JSON.stringify(crop.score)));
          });
        }.bind(this),
        100
      );
    });
    if (this.complete) {
      $(this).load();
    }
  });
});
