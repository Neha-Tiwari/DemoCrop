(function() {
  mocha.setup("bdd");
  var expect = chai.expect;

  var KITTY = "/examples/images/flickr/kitty.jpg";
  describe("smartcrop", function() {
    var img;
    beforeEach(function(done) {
      img = new Image();
      img.src = KITTY;
      img.onload = function() {
        done();
      };
    });
    function validResult(result) {
      expect(result.topCrop.x).to.be.within(
        0,
        img.width - result.topCrop.width
      );
      expect(result.topCrop.y).to.be.within(
        0,
        img.height - result.topCrop.height
      );
      expect(result.topCrop.width).to.be.within(1, img.width);
      expect(result.topCrop.height).to.be.within(1, img.height);
    }
    function expectAspectRatio(result, expected) {
      expect(result.topCrop.width / result.topCrop.height).to.be.closeTo(
        expected,
        0.01
      );
    }
    describe("isAvailable", function() {
      it("should return true when canvas is available", function() {
        expect(smartcrop.isAvailable()).to.equal(true);
      });
    });
    describe("crop", function() {
      it("should do something sane", function() {
        var c = document.createElement("canvas");
        var ctx = c.getContext("2d");
        c.width = 128;
        c.height = 64;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = "red";
        ctx.fillRect(96, 32, 16, 16);
        return smartcrop
          .crop(c, { width: 32, height: 32 })
          .then(function(result) {
            expectAspectRatio(result, 1);
            expect(result.topCrop.x).to.be.lessThan(96);
            expect(result.topCrop.y).to.be.lessThan(32);
            expect(result.topCrop.x + result.topCrop.width).to.be.greaterThan(
              112
            );
            expect(result.topCrop.y + result.topCrop.height).to.be.greaterThan(
              48
            );
          });
      });
      it("should take into account ruleOfThirds", function() {
        var c = document.createElement("canvas");
        var ctx = c.getContext("2d");
        c.width = 256;
        c.height = 128;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = "red";
        ctx.fillRect(128, 24, 8, 80);
        var optionsThirds = {
          width: 32,
          height: 32,
          ruleOfThirds: true,
          debug: true
        };
        var optionsNoThirds = {
          width: 32,
          height: 32,
          ruleOfThirds: false,
          debug: true
        };
        return smartcrop.crop(c, optionsThirds).then(function(resultThirds) {
          return smartcrop
            .crop(c, optionsNoThirds)
            .then(function(resultNoThirds) {
              validResult(resultThirds);
              validResult(resultNoThirds);
              expectAspectRatio(resultNoThirds, 1);
              expect(
                resultNoThirds.topCrop.x + resultNoThirds.topCrop.width / 2
              ).to.equal(128);
              expect(
                resultThirds.topCrop.x + resultThirds.topCrop.width / 2
              ).to.equal(144);
            });
        });
      });

      it("should adhere to minScale", function() {
        return smartcrop.crop(img, { minScale: 1 }).then(function(result) {
          validResult(result);
          expectAspectRatio(result, 1);
          expect(result.topCrop.y).to.equal(0);
          expect(result.topCrop.height).to.equal(img.height);
        });
      });
      it("should take into account boost", function() {
        var boost = [
          {
            x: img.width - 128,
            y: img.height - 128,
            width: 64,
            height: 64,
            weight: 1.0
          }
        ];
        return smartcrop
          .crop(img, { boost: boost, width: 64, height: 64 })
          .then(function(result) {
            validResult(result);
            expect(result.topCrop.y).to.equal(0);
            expect(result.topCrop.x).to.equal(200);
            expect(result.topCrop.height).to.equal(img.height);
          });
      });
      it("should take into account the aspect ratio", function() {
        return smartcrop
          .crop(img, { width: 128, height: 64 })
          .then(function(result) {
            validResult(result);
            expectAspectRatio(result, 2.0 / 1);
            return smartcrop
              .crop(img, { width: 160, height: 90 })
              .then(function(result) {
                validResult(result);
                expectAspectRatio(result, 16 / 9);
              });
          });
      });

      it("should crop the kitty", function() {
        return smartcrop.crop(img, {}).then(function(result) {
          validResult(result);
        });
      });
    });
    describe("iop", function() {
      describe("open", function() {
        it("passes input options", function() {
          var iop = smartcrop._canvasImageOperations(
            smartcrop.DEFAULTS.canvasFactory
          );
          var open = iop.open;
          var inputOptions;
          iop.open = function(image, inputOptions_) {
            inputOptions = inputOptions_;
            return open(image);
          };
          var options = {
            imageOperations: iop,
            input: { foo: "bar" }
          };
          return smartcrop.crop(img, options).then(function(result) {
            expect(inputOptions).to.equal(options.input);
            validResult(result);
          });
        });
      });
    });

    describe("_downSample", function() {
      var input = {
        width: 4,
        height: 4,
        data: mono2rgba([1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2])
      };
      function mono2rgba(input) {
        var output = new Uint8ClampedArray(input.length * 4);
        for (var i = 0; i < input.length; i++) {
          output[i * 4] = input[i];
          output[i * 4 + 1] = input[i];
          output[i * 4 + 2] = input[i];
          output[i * 4 + 3] = input[i];
        }
        return output;
      }
      it("keeps the image the same at a factor of one", function() {
        var output = smartcrop._downSample(input, 1);
        expect(output.width).to.equal(input.width);
        expect(output.height).to.equal(input.height);
        expect(output.data).to.deep.equal(input.data);
      });

      it("samples down an image by a factor of two", function() {
        var expectedOutputData = new Uint8ClampedArray([
          5,
          4,
          4,
          4,
          7,
          6,
          6,
          6,
          8,
          7,
          6,
          6,
          6,
          5,
          4,
          4
        ]);
        var output = smartcrop._downSample(input, 2);
        expect(output.width).to.equal(input.width / 2);
        expect(output.height).to.equal(input.height / 2);
        expect(output.data).to.deep.equal(expectedOutputData);
      });
      it("keeps a constant value constant", function() {
        var w = 59;
        var h = 23;
        var input = {
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4)
        };
        for (var i = 0; i < input.data.length; i++) {
          input.data[i] = 119;
        }
        var output = smartcrop._downSample(input, 8);
        expect(output.width).to.equal(~~(input.width / 8));
        expect(output.height).to.equal(~~(input.height / 8));
        for (i = 0; i < output.data.length; i++) {
          expect(output.data[i]).to.be.within(118, 120);
        }
      });
    });
  });
})();
