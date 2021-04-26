(function () {
  var _get = fabric.StaticCanvas.prototype.get;
  var _setBackgroundColor = fabric.StaticCanvas.prototype.setBackgroundColor;
  var _setOverlayColor = fabric.StaticCanvas.prototype.setOverlayColor;
  fabric.util.object.extend(fabric.StaticCanvas.prototype, {
    /**
     * See {@link fabric.EraserBrush#prepareCanvas}
     * @param {string} key 
     * @returns 
     */
    get: function (key) {
      var drawableKey = key;
      switch (key) {
        case 'backgroundImage':
          return this[drawableKey] && this[drawableKey].isType('group') ?
            this[drawableKey].getObjects('image')[0] :
            _get.call(this, key);
        case 'backgroundColor':
          drawableKey = 'backgroundImage';
          return this[drawableKey] && this[drawableKey].isType('group') ?
            this[drawableKey].getObjects('rect')[0] :
            _get.call(this, key);
        case 'overlayImage':
          return this[drawableKey] && this[drawableKey].isType('group') ?
            this[drawableKey].getObjects('image')[0] :
            _get.call(this, key);
        case 'overlayColor':
          drawableKey = 'overlayImage';
          return this[drawableKey] && this[drawableKey].isType('group') ?
            this[drawableKey].getObjects('rect')[0] :
            _get.call(this, key);
        default:
          return _get.call(this, key);
      }
    },

    /**
     * Helper to set `erasable` on color
     * @param {'bakground'|'overlay'} layer 
     * @param {(String|fabric.Pattern)} Color or pattern
     * @param {Function} callback Callback to invoke when color is set
     * @param {Object} options
     */
    _setLayerColor: function (layer, color, callback, options) {
      var colorPropKey = layer + 'Color';
      var erasable = (options && options.erasable) || false;
      var target = this[colorPropKey];
      if (typeof target === 'object' && target.isType('rect')) {
        target.set({
          fill: color,
          erasable: erasable
        });
      } else {
        this.__setBgOverlayColor(colorPropKey, color, callback);
        this[colorPropKey + 'Erasable'] = erasable;
      }
      return this;
    },

    /**
     * Helper to set `erasable` on color
     * @param {(String|fabric.Pattern)} Color or pattern 
     * @param {Function} callback Callback to invoke when color is set
     * @param {Object} options
     * @return {fabric.Canvas} thisArg
     */
    setBackgroundColor: function (color, callback, options) {
      return this._setLayerColor('background', color, callback, options);
    },

    /**
     * Helper to set `erasable` on color
     * @param {(String|fabric.Pattern)} Color or pattern 
     * @param {Function} callback Callback to invoke when color is set
     * @param {Object} options
     * @return {fabric.Canvas} thisArg
     */
    setOverlayColor: function (color, callback, options) {
      return this._setLayerColor('overlay', color, callback, options);
    },
  });

  var toObject = fabric.Object.prototype.toObject;
  fabric.util.object.extend(fabric.Object.prototype, {
    /**
     * Indicates whether this object can be erased by {@link fabric.EraserBrush}
     * @type boolean
     * @default true
     */
    erasable: true,

    /**
     * 
     * @returns {fabric.Group | null}
     */
    getEraser: function () {
      return this.clipPath && this.clipPath.eraser ? this.clipPath : null;
    },

    /**
     * Returns an object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} Object representation of an instance
     */
    toObject: function (additionalProperties) {
      return toObject.call(this, ['erasable'].concat(additionalProperties));
    }
  });

  var groupToObject = fabric.Group.prototype.toObject;
  fabric.util.object.extend(fabric.Group.prototype, {
    /**
     * Returns an object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} Object representation of an instance
     */
    toObject: function (additionalProperties) {
      return groupToObject.call(this, ['eraser'].concat(additionalProperties));
    }
  });

  fabric.util.object.extend(fabric.Canvas.prototype, {
    /**
     * Used by {@link #renderAll}
     * @returns boolean
     */
    isErasing: function () {
      return (
        this.isDrawingMode &&
        this.freeDrawingBrush &&
        this.freeDrawingBrush.type === 'eraser' &&
        this.freeDrawingBrush._isErasing
      );
    },

    /**
     * While erasing, the brush is in charge of rendering the canvas
     * It uses both layers to achieve diserd erasing effect
     * 
     * @returns fabric.Canvas
     */
    renderAll: function () {
      if (this.contextTopDirty && !this._groupSelector && !this.isDrawingMode) {
        this.clearContext(this.contextTop);
        this.contextTopDirty = false;
      }
      // while erasing the brush is in charge of rendering the canvas so we return
      if (this.isErasing()) {
        this.freeDrawingBrush._render();
        return;
      }
      if (this.hasLostContext) {
        this.renderTopLayer(this.contextTop);
      }
      var canvasToDrawOn = this.contextContainer;
      this.renderCanvas(canvasToDrawOn, this._chooseObjectsToRender());
      return this;
    }
  });


  /**
   * EraserBrush class
   * Supports selective erasing meaning that only erasable objects are affected by the eraser brush.
   * In order to support selective erasing all non erasable objects are rendered on the main/bottom ctx
   * while the entire canvas is rendered on the top ctx. 
   * Canvas bakground/overlay image/color are handled as well.
   * When erasing occurs, the path clips the top ctx and reveals the bottom ctx.
   * This achieves the desired effect of seeming to erase only erasable objects.
   * After erasing is done the created path is added to all intersected objects' `clipPath` property.
   * 
   * 
   * @class fabric.EraserBrush
   * @extends fabric.PencilBrush
   */
  fabric.EraserBrush = fabric.util.createClass(
    fabric.PencilBrush,
    /** @lends fabric.EraserBrush.prototype */ {
      type: 'eraser',

      /**
       * Indicates that the ctx is ready and rendering can begin.
       * Used to prevent a race condition caused by {@link fabric.EraserBrush#onMouseMove} firing before {@link fabric.EraserBrush#onMouseDown} has completed
       * 
       * @private
       */
      _ready: false,

      /**
       * @private
       */
      _drawOverlayOnTop: false,

      /**
       * @private
       */
      _isErasing: false,

      initialize: function (canvas) {
        this.callSuper('initialize', canvas);
        this._renderBound = this._render.bind(this);
        this.render = this.render.bind(this);
      },

      /**
       * @private
       * @param {Function} callback 
       * @returns 
       */
      forCanvasDrawables: function (callback) {
        var _this = this;
        callback.call(
          _this,
          'background',
          'backgroundImage',
          'setBackgroundImage',
          'backgroundColor',
          'setBackgroundColor'
        );
        callback.call(
          _this,
          'overlay',
          'overlayImage',
          'setOverlayImage',
          'overlayColor',
          'setOverlayColor'
        );
      },

      /**
       * In order to be able to clip out the canvas' overlay/background color
       * we group background/overlay image and color and assign the group to the canvas' appropriate image property
       * @param {fabric.Canvas} canvas
       */
      prepareCanvas: function (canvas) {
        this.forCanvasDrawables(
          function (drawable, imgProp, imgSetter, colorProp, colorSetter) {
            var image = canvas[imgProp], color = canvas[colorProp];
            if ((image || color) && (!image || !image.isType('group'))) {
              var erasablePropKey = colorProp + 'Erasable';
              var mergedGroup = new fabric.Group([], {
                width: canvas.width,
                height: canvas.height,
                erasable: true
              });
              if (image) {
                mergedGroup.addWithUpdate(image);
                mergedGroup._image = image;
              }
              if (color) {
                color = new fabric.Rect({
                  width: canvas.width,
                  height: canvas.height,
                  fill: color,
                  erasable: typeof color === 'object' && typeof color.erasable === 'boolean' ?
                    color.erasable :
                    canvas[erasablePropKey]
                });
                canvas[erasablePropKey] = undefined;
                mergedGroup.addWithUpdate(color);
                mergedGroup._color = color;
              }
              canvas[imgSetter](mergedGroup);
              canvas[colorSetter](null);
            }
          });
        this._ready = true;
      },

      /**
       * Used to hide a drawable from the rendering process
       * @param {fabric.Object} object 
       */
      hideObject: function (object) {
        if (object) {
          object._originalOpacity = object.opacity;
          object.set({ opacity: 0 });
        }
      },

      /**
       * Restores hiding an object 
       * {@link favric.EraserBrush#hideObject}
       * @param {fabric.Object} object
       */
      restoreObjectVisibility: function (object) {
        if (object && object._originalOpacity) {
          object.set({ opacity: object._originalOpacity });
          object._originalOpacity = undefined;
        }
      },

      /**
       * Drawing Logic For background drawables: (`backgroundImage`, `backgroundColor`)
       * 1. if erasable = true:
       *    we need to hide the drawable on the bottom ctx so when the brush is erasing it will clip the top ctx and reveal white space underneath
       * 2. if erasable = false:
       *    we need to draw the drawable only on the bottom ctx so the brush won't affect it
       * @param {'bottom' | 'top' | 'overlay'} layer
       */
      prepareCanvasBackgroundForLayer: function (layer) {
        if (layer === 'overlay') {
          return;
        }
        var canvas = this.canvas;
        var image = canvas.get('backgroundImage');
        var color = canvas.get('backgroundColor');
        var erasablesOnLayer = layer === 'top';
        if (image && image.erasable === !erasablesOnLayer) {
          this.hideObject(image);
        }
        if (color && color.erasable === !erasablesOnLayer) {
          this.hideObject(color);
        }
      },

      /**
       * Drawing Logic For overlay drawables (`overlayImage`, `overlayColor`)
       * We must draw on top ctx to be on top of visible canvas
       * 1. if erasable = true:
       *    we need to draw the drawable on the top ctx as a normal object
       * 2. if erasable = false:
       *    we need to draw the drawable on top of the brush,
       *    this means we need to repaint for every stroke
       * 
       * @param {'bottom' | 'top' | 'overlay'} layer
       * @returns boolean render overlay above brush
       */
      prepareCanvasOverlayForLayer: function (layer) {
        var canvas = this.canvas;
        var image = canvas.get('overlayImage');
        var color = canvas.get('overlayColor');
        if (layer === 'bottom') {
          this.hideObject(image);
          this.hideObject(color);
          return false;
        };
        var erasablesOnLayer = layer === 'top';
        var renderOverlayOnTop = (image && !image.erasable) || (color && !color.erasable);
        if (image && image.erasable === !erasablesOnLayer) {
          this.hideObject(image);
        }
        if (color && color.erasable === !erasablesOnLayer) {
          this.hideObject(color);
        }
        return renderOverlayOnTop;
      },

      /**
       * @private
       */
      restoreCanvasDrawables: function () {
        var canvas = this.canvas;
        this.restoreObjectVisibility(canvas.get('backgroundImage'));
        this.restoreObjectVisibility(canvas.get('backgroundColor'));
        this.restoreObjectVisibility(canvas.get('overlayImage'));
        this.restoreObjectVisibility(canvas.get('overlayColor'));
      },

      /**
       * @private 
       * This is designed to support erasing a group with both erasable and non-erasable objects.
       * Iterates over collections to allow nested selective erasing.
       * Used by {@link fabric.EraserBrush#prepareCanvasObjectsForLayer} 
       * to prepare the bottom layer by hiding erasable nested objects
       * 
       * @param {fabric.Collection} collection 
       */
      prepareCollectionTraversal: function (collection) {
        var _this = this;
        collection.forEachObject(function (obj) {
          if (obj.forEachObject) {
            _this.prepareCollectionTraversal(obj);
          } else {
            if (obj.erasable) {
              _this.hideObject(obj);
            }
          }
        });
      },

      /**
       * @private
       * Used by {@link fabric.EraserBrush#prepareCanvasObjectsForLayer} 
       * to reverse the action of {@link fabric.EraserBrush#prepareCollectionTraversal}
       * 
       * @param {fabric.Collection} collection
       */
      restoreCollectionTraversal: function (collection) {
        var _this = this;
        collection.forEachObject(function (obj) {
          if (obj.forEachObject) {
            _this.restoreCollectionTraversal(obj);
          } else {
            _this.restoreObjectVisibility(obj);
          }
        });
      },

      /**
       * @private
       * This is designed to support erasing a group with both erasable and non-erasable objects.
       * 
       * @param {'bottom' | 'top' | 'overlay'} layer
       */
      prepareCanvasObjectsForLayer: function (layer) {
        if (layer !== 'bottom') return;
        this.prepareCollectionTraversal(this.canvas);
      },

      /**
       * @private
       * @param {'bottom' | 'top' | 'overlay'} layer
       */
      restoreCanvasObjectsFromLayer: function (layer) {
        if (layer !== 'bottom') return;
        this.restoreCollectionTraversal(this.canvas);
      },

      /**
       * @private
       * @param {'bottom' | 'top' | 'overlay'} layer 
       * @returns boolean render overlay above brush
       */
      prepareCanvasForLayer: function (layer) {
        this.prepareCanvasBackgroundForLayer(layer);
        this.prepareCanvasObjectsForLayer(layer);
        return this.prepareCanvasOverlayForLayer(layer);
      },

      /**
      * @private
      * @param {'bottom' | 'top' | 'overlay'} layer
      */
      restoreCanvasFromLayer: function (layer) {
        this.restoreCanvasDrawables();
        this.restoreCanvasObjectsFromLayer(layer);
      },

      /**
       * Render all non-erasable objects on bottom layer with the exception of overlays to avoid being clipped by the brush.
       * Groups are rendered for nested selective erasing, non-erasable objects are visible while erasable objects are not.
       */
      renderBottomLayer: function () {
        var canvas = this.canvas;
        this.prepareCanvasForLayer('bottom');
        canvas.renderCanvas(
          canvas.getContext(),
          canvas.getObjects().filter(function (obj) {
            return !obj.erasable || obj.isType('group');
          })
        );
        this.restoreCanvasFromLayer('bottom');
      },

      /**
       * 1. Render all objects on top layer, erasable and non-erasable
       *    This is important for cases such as overlapping objects, the background object erasable and the foreground object not erasable.
       * 2. Render the brush
       */
      renderTopLayer: function () {
        var canvas = this.canvas;
        this._drawOverlayOnTop = this.prepareCanvasForLayer('top');
        canvas.renderCanvas(
          canvas.contextTop,
          canvas.getObjects()
        );
        this.callSuper('_render');
        this.restoreCanvasFromLayer('top');
      },

      /**
       * Render all non-erasable overlays on top of the brush so that they won't get erased
       */
      renderOverlay: function () {
        this.prepareCanvasForLayer('overlay');
        var canvas = this.canvas;
        var ctx = canvas.contextTop;
        this._saveAndTransform(ctx);
        canvas._renderOverlay(ctx);
        ctx.restore();
        this.restoreCanvasFromLayer('overlay');
      },

      /**
       * @extends @class fabric.BaseBrush
       * @param {CanvasRenderingContext2D} ctx
       */
      _saveAndTransform: function (ctx) {
        this.callSuper('_saveAndTransform', ctx);
        ctx.globalCompositeOperation = 'destination-out';
      },

      /**
       * We indicate {@link fabric.PencilBrush} to repaint itself if necessary
       * @returns 
       */
      needsFullRender: function () {
        return this.callSuper('needsFullRender') || this._drawOverlayOnTop;
      },

      /**
       * 
       * @param {fabric.Point} pointer
       * @param {fabric.IEvent} options
       * @returns
       */
      onMouseDown: function (pointer, options) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._prepareForDrawing(pointer);
        // capture coordinates immediately
        // this allows to draw dots (when movement never occurs)
        this._captureDrawingPath(pointer);

        this._isErasing = true;
        this.canvas.fire('erasing:start');
        this.prepareCanvas(this.canvas);
        this._render();
      },

      /**
       * Rendering is done in 4 steps:
       * 1. Draw all non-erasable objects on bottom ctx with the exception of overlays {@link fabric.EraserBrush#renderBottomLayer}
       * 2. Draw all objects on top ctx including erasable drawables {@link fabric.EraserBrush#renderTopLayer}
       * 3. Draw eraser {@link fabric.PencilBrush#_render} at {@link fabric.EraserBrush#renderTopLayer}
       * 4. Draw non-erasable overlays {@link fabric.EraserBrush#renderOverlay}
       * 
       * @param {fabric.Canvas} canvas
       */
      _render: function () {
        if (!this._ready) {
          return;
        }
        this.isRendering = 1;
        this.renderBottomLayer();
        this.renderTopLayer();
        this.renderOverlay();
        this.isRendering = 0;
      },

      /**
       * @public
       */
      render: function () {
        if (this._isErasing) {
          if (this.isRendering) {
            this.isRendering = fabric.util.requestAnimFrame(this._renderBound);
          } else {
            this._render();
          }
          return true;
        }
        return false;
      },

      /**
       * Adds path to existing clipPath of object
       * 
       * @param {fabric.Object} obj
       * @param {fabric.Path} path
       */
      _addPathToObjectEraser: function (obj, path) {
        var clipObject;
        var _this = this;
        //  object is collection, i.e group
        if (obj.forEachObject) {
          obj.forEachObject(function (_obj) {
            if (_obj.erasable) {
              _this._addPathToObjectEraser(_obj, path);
            }
          });
          return;
        }
        if (!obj.getEraser()) {
          var rect = new fabric.Rect({
            width: obj.width,
            height: obj.height,
            clipPath: obj.clipPath,
            originX: "center",
            originY: "center"
          });
          var objects = [rect];
          clipObject = new fabric.Group(objects, {
            boundingObjects: objects,
            eraser: true
          });
        } else {
          clipObject = obj.clipPath;
        }

        path.clone(function (path) {
          path.globalCompositeOperation = "destination-out";
          // http://fabricjs.com/using-transformations
          var desiredTransform = fabric.util.multiplyTransformMatrices(
            fabric.util.invertTransform(
              obj.calcTransformMatrix()
            ),
            path.calcTransformMatrix()
          );
          fabric.util.applyTransformToObject(path, desiredTransform);
          clipObject.addWithUpdate(path);
          obj.set({
            clipPath: clipObject,
            dirty: true
          });
        });
      },

      /**
       * Add the eraser path to canvas drawables' clip paths
       * 
       * @param {fabric.Canvas} source
       * @param {fabric.Canvas} path
       */
      applyEraserToCanvas: function (path) {
        var canvas = this.canvas;
        this.forCanvasDrawables(
          function (drawable, imgProp, _, colorProp) {
            var sourceImage = canvas.get(imgProp);
            var sourceColor = canvas.get(colorProp);
            if (sourceImage && sourceImage.erasable) {
              this._addPathToObjectEraser(sourceImage, path);
            }
            if (sourceColor && sourceColor.erasable) {
              this._addPathToObjectEraser(sourceColor, path);
            }
          });
      },

      /**
       * On mouseup after drawing the path on contextTop canvas
       * we use the points captured to create an new fabric path object
       * and add it to every intersected erasable object.
       */
      _finalizeAndAddPath: function () {
        var ctx = this.canvas.contextTop, canvas = this.canvas;
        ctx.closePath();
        if (this.decimate) {
          this._points = this.decimatePoints(this._points, this.decimate);
        }

        // clear
        canvas.clearContext(canvas.contextTop);
        this._isErasing = false;

        var pathData = this._points && this._points.length > 1 ?
          this.convertPointsToSVGPath(this._points).join('') :
          'M 0 0 Q 0 0 0 0 L 0 0';
        if (pathData === 'M 0 0 Q 0 0 0 0 L 0 0') {
          canvas.fire('erasing:end');
          // do not create 0 width/height paths, as they are
          // rendered inconsistently across browsers
          // Firefox 4, for example, renders a dot,
          // whereas Chrome 10 renders nothing
          canvas.requestRenderAll();
          return;
        }

        var path = this.createPath(pathData);
        canvas.fire('before:path:created', { path: path });

        // finalize erasing
        this.applyEraserToCanvas(path);
        var _this = this;
        canvas.forEachObject(function (obj) {
          if (obj.erasable && obj.intersectsWithObject(path)) {
            _this._addPathToObjectEraser(obj, path);
          }
        });

        canvas.fire('erasing:end');

        canvas.requestRenderAll();
        path.setCoords();
        this._resetShadow();

        // fire event 'path' created
        canvas.fire('path:created', { path: path });
      }
    }
  );
})();
