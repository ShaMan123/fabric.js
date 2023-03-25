(function() {
  var canvas = this.canvas = new fabric.StaticCanvas(null, {enableRetinaScaling: false});
  QUnit.module('fabric.ObjectGeometry');

  QUnit.test('intersectsWithRectangle without zoom', function(assert) {
    var cObj = new fabric.Object({ left: 50, top: 50, width: 100, height: 100 });
    assert.ok(typeof cObj.intersectsWithRect === 'function');

    var point1 = new fabric.Point(110, 100),
        point2 = new fabric.Point(210, 200),
        point3 = new fabric.Point(0, 0),
        point4 = new fabric.Point(10, 10);

    assert.ok(cObj.intersectsWithRect(point1, point2));
    assert.ok(!cObj.intersectsWithRect(point3, point4));
  });

  QUnit.test('intersectsWithRectangle with zoom', function(assert) {
    var cObj = new fabric.Rect({ left: 10, top: 10, width: 20, height: 20 });
    canvas.add(cObj);
    canvas.viewportTransform = [2, 0, 0, 2, 0, 0];

    var point1 = new fabric.Point(5, 5),
        point2 = new fabric.Point(15, 15),
        point3 = new fabric.Point(25, 25),
        point4 = new fabric.Point(35, 35);

    assert.ok(cObj.intersectsWithRect(point1, point2), 'Does intersect also with a 2x zoom');
    assert.ok(cObj.intersectsWithRect(point3, point4), 'Does intersect also with a 2x zoom');
  });

  QUnit.test('intersectsWithObject', function(assert) {
    var cObj = new fabric.Object({ left: 50, top: 50, width: 100, height: 100 });
    assert.ok(typeof cObj.intersectsWithObject === 'function', 'has intersectsWithObject method');

    var cObj2 = new fabric.Object({ left: -150, top: -150, width: 200, height: 200 });
    assert.ok(cObj.intersectsWithObject(cObj2), 'cobj2 does intersect with cobj');
    assert.ok(cObj2.intersectsWithObject(cObj), 'cobj2 does intersect with cobj');

    var cObj3 = new fabric.Object({ left: 392.5, top: 339.5, width: 13, height: 33 });
    assert.ok(!cObj.intersectsWithObject(cObj3), 'cobj3 does not intersect with cobj (external)');
    assert.ok(!cObj3.intersectsWithObject(cObj), 'cobj3 does not intersect with cobj (external)');

    var cObj4 = new fabric.Object({ left: 0, top: 0, width: 200, height: 200 });
    assert.ok(cObj4.intersectsWithObject(cObj), 'overlapping objects are considered intersecting');
    assert.ok(cObj.intersectsWithObject(cObj4), 'overlapping objects are considered intersecting');
  });

  QUnit.test('isContainedWithinRect', function(assert) {
    var cObj = new fabric.Object({ left: 20, top: 20, width: 10, height: 10 });
    assert.ok(typeof cObj.isContainedWithinRect === 'function');

    // fully contained
    assert.ok(cObj.isContainedWithinRect(new fabric.Point(10,10), new fabric.Point(100,100)));
    // only intersects
    assert.ok(!cObj.isContainedWithinRect(new fabric.Point(10,10), new fabric.Point(25, 25)));
    // doesn't intersect
    assert.ok(!cObj.isContainedWithinRect(new fabric.Point(100,100), new fabric.Point(110, 110)));
  });

  QUnit.test('isContainedWithinRect with zoom', function(assert) {
    var cObj = new fabric.Rect({ left: 20, top: 20, width: 10, height: 10 });
    canvas.add(cObj);
    canvas.viewportTransform = [2, 0, 0, 2, 0, 0];
    assert.ok(typeof cObj.isContainedWithinRect === 'function');

    // fully contained
    assert.ok(cObj.isContainedWithinRect(new fabric.Point(10,10), new fabric.Point(100,100)));
    // only intersects
    assert.ok(!cObj.isContainedWithinRect(new fabric.Point(10,10), new fabric.Point(25, 25)));
    // doesn't intersect
    assert.ok(!cObj.isContainedWithinRect(new fabric.Point(100,100), new fabric.Point(110, 110)));
  });

  QUnit.test('intersectsWithRect', function(assert) {
    var object = new fabric.Object({ left: 0, top: 0, width: 40, height: 50, angle: 160 }),
        point1 = new fabric.Point(-10, -10),
        point2 = new fabric.Point(20, 30),
        point3 = new fabric.Point(10, 15),
        point4 = new fabric.Point(30, 35),
        point5 = new fabric.Point(50, 60),
        point6 = new fabric.Point(70, 80);

    // object and area intersects
    assert.equal(object.intersectsWithRect(point1, point2), true);
    // area is contained in object (no intersection)
    assert.equal(object.intersectsWithRect(point3, point4), false);
    // area is outside of object (no intersection)
    assert.equal(object.intersectsWithRect(point5, point6), false);
  });

  QUnit.test('intersectsWithObject', function(assert) {
    var object = new fabric.Object({ left: 20, top: 30, width: 40, height: 50, angle: 230, strokeWidth: 0 }),
        object1 = new fabric.Object({ left: 20, top: 30, width: 60, height: 30, angle: 10, strokeWidth: 0 }),
        object2 = new fabric.Object({ left: 25, top: 35, width: 20, height: 20, angle: 50, strokeWidth: 0 }),
        object3 = new fabric.Object({ left: 50, top: 50, width: 20, height: 20, angle: 0, strokeWidth: 0 });

    object.set({ originX: 'center', originY: 'center' });
    object1.set({ originX: 'center', originY: 'center' });
    object2.set({ originX: 'center', originY: 'center' });
    object3.set({ originX: 'center', originY: 'center' });

    function intersect(abs) {
      assert.equal(object.intersectsWithObject(object1, abs), true, 'object and object1 intersects');
      assert.equal(object.intersectsWithObject(object2, abs), true, 'object2 is contained in object');
      assert.equal(object.intersectsWithObject(object3, abs), false, 'object3 is outside of object (no intersection)');
    }

    intersect();
    intersect(true);
    const group = new fabric.Group([object1, object2, object3], { subTargetCheck: true });
    intersect();
    intersect(true);
  });

  QUnit.test('isContainedWithinObject', function(assert) {
    var object = new fabric.Object({ left: 0, top: 0, width: 40, height: 40, angle: 0 }),
        object1 = new fabric.Object({ left: 1, top: 1, width: 38, height: 38, angle: 0 }),
        object2 = new fabric.Object({ left: 20, top: 20, width: 40, height: 40, angle: 0 }),
        object3 = new fabric.Object({ left: 50, top: 50, width: 40, height: 40, angle: 0 });

    assert.equal(object1.isContainedWithinObject(object), true, 'object1 is fully contained within object');
    assert.equal(object2.isContainedWithinObject(object), false, 'object2 intersects object (not fully contained)');
    assert.equal(object3.isContainedWithinObject(object), false, 'object3 is outside of object (not fully contained)');
    object1.angle = 45;
    object1.invalidateCoords();
    assert.equal(object1.isContainedWithinObject(object), false, 'object1 rotated is not contained within object');

    var rect1 = new fabric.Rect({
      width: 50,
      height: 50,
      left: 50,
      top: 50
    });

    var rect2 = new fabric.Rect({
      width: 100,
      height: 100,
      left: 100,
      top: 0,
      angle: 45,
    });
    assert.equal(rect1.isContainedWithinObject(rect2), false, 'rect1 rotated is not contained within rect2');
  });

  QUnit.test('isContainedWithinRect', function(assert) {
    var object = new fabric.Object({ left: 40, top: 40, width: 40, height: 50, angle: 160 }),
        point1 = new fabric.Point(0, 0),
        point2 = new fabric.Point(80, 80),
        point3 = new fabric.Point(0, 0),
        point4 = new fabric.Point(80, 60),
        point5 = new fabric.Point(80, 80),
        point6 = new fabric.Point(90, 90);

    object.set({ originX: 'center', originY: 'center' })

    // area is contained in object (no intersection)
    assert.equal(object.isContainedWithinRect(point1, point2), true);
    // object and area intersects
    assert.equal(object.isContainedWithinRect(point3, point4), false);
    // area is outside of object (no intersection)
    assert.equal(object.isContainedWithinRect(point5, point6), false);
  });

  QUnit.test('isContainedWithinRect', function(assert) {
    var object = new fabric.Object({ left: 40, top: 40, width: 40, height: 50, angle: 160 }),
        point1 = new fabric.Point(0, 0),
        point2 = new fabric.Point(80, 80),
        point3 = new fabric.Point(0, 0),
        point4 = new fabric.Point(80, 60),
        point5 = new fabric.Point(80, 80),
        point6 = new fabric.Point(90, 90);

    object.set({ originX: 'center', originY: 'center' })

    // area is contained in object (no intersection)
    assert.equal(object.isContainedWithinRect(point1, point2), true);
    // object and area intersects
    assert.equal(object.isContainedWithinRect(point3, point4), false);
    // area is outside of object (no intersection)
    assert.equal(object.isContainedWithinRect(point5, point6), false);
  });

  QUnit.test('containsPoint', function(assert) {
    var object = new fabric.Object({ left: 40, top: 40, width: 40, height: 50, angle: 160, strokeWidth: 0 }),
        point1 = new fabric.Point(30, 30),
        point2 = new fabric.Point(60, 30),
        point3 = new fabric.Point(45, 65),
        point4 = new fabric.Point(15, 40),
        point5 = new fabric.Point(30, 15);

    object.set({ originX: 'center', originY: 'center' })

    // point1 is contained in object
    assert.equal(object.containsPoint(point1), true);
    // point2 is outside of object (right)
    assert.equal(object.containsPoint(point2), false);
    // point3 is outside of object (bottom)
    assert.equal(object.containsPoint(point3), false);
    // point4 is outside of object (left)
    assert.equal(object.containsPoint(point4), false);
    // point5 is outside of object (top)
    assert.equal(object.containsPoint(point5), false);
  });

  QUnit.test('setCoords', function(assert) {
    var cObj = new fabric.Object({ left: 150, top: 150, width: 100, height: 100, strokeWidth: 0,canvas:{}});
    assert.ok(typeof cObj.setCoords === 'function');
    cObj.setCoords();
    assert.equal(cObj.controlCoords.tl.position.x, 150);
    assert.equal(cObj.controlCoords.tl.position.y, 150);
    assert.equal(cObj.controlCoords.tr.position.x, 250);
    assert.equal(cObj.controlCoords.tr.position.y, 150);
    assert.equal(cObj.controlCoords.bl.position.x, 150);
    assert.equal(cObj.controlCoords.bl.position.y, 250);
    assert.equal(cObj.controlCoords.br.position.x, 250);
    assert.equal(cObj.controlCoords.br.position.y, 250);
    assert.equal(cObj.controlCoords.mtr.position.x, 200);
    assert.equal(cObj.controlCoords.mtr.position.y, 110);

    cObj.set('left', 250).set('top', 250);

    assert.equal(cObj.bboxCoords, undefined);
    assert.equal(cObj.controlCoords, undefined);

    // recalculate coords
    cObj.setCoords();

    // check that coords are now updated
    assert.equal(cObj.controlCoords.tl.position.x, 250);
    assert.equal(cObj.controlCoords.tl.position.y, 250);
    assert.equal(cObj.controlCoords.tr.position.x, 350);
    assert.equal(cObj.controlCoords.tr.position.y, 250);
    assert.equal(cObj.controlCoords.bl.position.x, 250);
    assert.equal(cObj.controlCoords.bl.position.y, 350);
    assert.equal(cObj.controlCoords.br.position.x, 350);
    assert.equal(cObj.controlCoords.br.position.y, 350);
    assert.equal(cObj.controlCoords.mtr.position.x, 300);
    assert.equal(cObj.controlCoords.mtr.position.y, 210);

    cObj.set('padding', 25);
    assert.equal(cObj.controlCoords, undefined);
    cObj.setCoords();
    // coords should still correspond to initial one, even after invoking `set`
    assert.equal(cObj.controlCoords.tl.position.x, 225, 'setCoords tl.position.x padding');
    assert.equal(cObj.controlCoords.tl.position.y, 225, 'setCoords tl.position.y padding');
    assert.equal(cObj.controlCoords.tr.position.x, 375, 'setCoords tr.position.x padding');
    assert.equal(cObj.controlCoords.tr.position.y, 225, 'setCoords tr.position.y padding');
    assert.equal(cObj.controlCoords.bl.position.x, 225, 'setCoords bl.position.x padding');
    assert.equal(cObj.controlCoords.bl.position.y, 375, 'setCoords bl.position.y padding');
    assert.equal(cObj.controlCoords.br.position.x, 375, 'setCoords br.position.x padding');
    assert.equal(cObj.controlCoords.br.position.y, 375, 'setCoords br.position.y padding');
    assert.equal(cObj.controlCoords.mtr.position.x, 300, 'setCoords mtr.position.x padding');
    assert.equal(cObj.controlCoords.mtr.position.y, 185, 'setCoords mtr.position.y padding');
  });

  QUnit.test.skip('setCoords and aCoords', function(assert) {
    var cObj = new fabric.Object({ left: 150, top: 150, width: 100, height: 100, strokeWidth: 0});
    cObj.canvas = {
      viewportTransform: [2, 0, 0, 2, 0, 0]
    };
    cObj.setCoords();

    assert.equal(cObj.controlCoords.tl.position.x, 300, 'controlCoords are modified by viewportTransform tl.position.x');
    assert.equal(cObj.controlCoords.tl.position.y, 300, 'controlCoords are modified by viewportTransform tl.position.y');
    assert.equal(cObj.controlCoords.tr.position.x, 500, 'controlCoords are modified by viewportTransform tr.position.x');
    assert.equal(cObj.controlCoords.tr.position.y, 300, 'controlCoords are modified by viewportTransform tr.position.y');
    assert.equal(cObj.controlCoords.bl.position.x, 300, 'controlCoords are modified by viewportTransform bl.position.x');
    assert.equal(cObj.controlCoords.bl.position.y, 500, 'controlCoords are modified by viewportTransform bl.position.y');
    assert.equal(cObj.controlCoords.br.position.x, 500, 'controlCoords are modified by viewportTransform br.position.x');
    assert.equal(cObj.controlCoords.br.position.y, 500, 'controlCoords are modified by viewportTransform br.position.y');
    assert.equal(cObj.controlCoords.mtr.position.x, 400, 'controlCoords are modified by viewportTransform mtr.position.x');
    assert.equal(cObj.controlCoords.mtr.position.y, 260, 'controlCoords are modified by viewportTransform mtr.position.y');

    assert.equal(cObj.bboxCoords.tl.x, 150, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.tl.y, 150, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.tr.x, 250, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.tr.y, 150, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.bl.x, 150, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.bl.y, 250, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.br.x, 250, 'bboxCoords do not interfere with viewportTransform');
    assert.equal(cObj.bboxCoords.br.y, 250, 'bboxCoords do not interfere with viewportTransform');
  });

  QUnit.test('transformMatrixKey depends from properties', function(assert) {
    var cObj = new fabric.Object(
      { left: -10, top: -10, width: 30, height: 40, strokeWidth: 0});
    var key1 = cObj.transformMatrixKey();
    cObj.left = 5;
    var key2 = cObj.transformMatrixKey();
    cObj.left = -10;
    var key3 = cObj.transformMatrixKey();
    cObj.width = 5;
    var key4 = cObj.transformMatrixKey();
    assert.notEqual(key1, key2, 'keys are different');
    assert.equal(key1, key3, 'keys are equal');
    assert.notEqual(key4, key2, 'keys are different');
    assert.notEqual(key4, key1, 'keys are different');
    assert.notEqual(key4, key3, 'keys are different');
  });

  QUnit.test('transformMatrixKey depends from originX/originY', function(assert) {
    var cObj = new fabric.Object(
      { left: -10, top: -10, width: 30, height: 40, strokeWidth: 0, originX: 'left', originY: 'top' });
    var key1 = cObj.transformMatrixKey();
    cObj.originX = 'center';
    var key2 = cObj.transformMatrixKey();
    cObj.originY = 'center';
    var key3 = cObj.transformMatrixKey();
    assert.notEqual(key1, key2, 'keys are different origins 1');
    assert.notEqual(key1, key3, 'keys are different origins 2');
    assert.notEqual(key2, key3, 'keys are different origins 3');
  });

  QUnit.test('calcTransformMatrix with no group', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 0 });
    assert.ok(typeof cObj.calcTransformMatrix === 'function', 'calcTransformMatrix should exist');
    cObj.top = 0;
    cObj.left = 0;
    cObj.scaleX = 2;
    cObj.scaleY = 3;
    assert.deepEqual(cObj.calcTransformMatrix(), cObj.calcOwnMatrix(), 'without group matrix is same');
  });

  QUnit.test('calcOwnMatrix', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 0 });
    assert.ok(typeof cObj.calcOwnMatrix === 'function', 'calcTransformMatrix should exist');
    cObj.top = 0;
    cObj.left = 0;
    assert.deepEqual(cObj.calcOwnMatrix(), [1, 0, 0, 1, 5, 7.5], 'only translate matrix');
    cObj.scaleX = 2;
    cObj.scaleY = 3;
    assert.deepEqual(cObj.calcOwnMatrix(), [2, 0, 0, 3, 10, 22.5], 'only translate matrix and scale');
    cObj.skewX = 45;
    assert.deepEqual(cObj.calcOwnMatrix(), [2, 0, 1.9999999999999998, 3, 25, 22.5], 'translate matrix scale skewX');
    cObj.skewY = 30;
    assert.deepEqual(cObj.calcOwnMatrix(), [3.1547005383792515, 1.7320508075688772, 1.9999999999999998, 3, 30.773502691896255, 31.160254037844386], 'translate matrix scale skewX skewY');
    cObj.angle = 38;
    assert.deepEqual(cObj.calcOwnMatrix(), [1.4195809931249126,
      3.3071022498267006,
      -0.2709629187635314,
      3.595355211471482,
      5.065683074898075,
      43.50067533516962], 'translate matrix scale skewX skewY angle');
    cObj.flipX = true;
    assert.deepEqual(cObj.calcOwnMatrix(), [-3.552294904178618,
      -0.5773529255117364,
      -3.4230059331904186,
      1.1327093101688495,
      5.065683074898075,
      43.50067533516962], 'translate matrix scale skewX skewY angle flipX');
    cObj.flipY = true;
    assert.deepEqual(cObj.calcOwnMatrix(), [-1.4195809931249126,
      -3.3071022498267006,
      0.2709629187635314,
      -3.595355211471482,
      5.065683074898075,
      43.50067533516962], 'translate matrix scale skewX skewY angle flipX flipY');
  });

  QUnit.test('getBoundingRect with absolute coords', function(assert) {
    var cObj = new fabric.Object({ strokeWidth: 0, width: 10, height: 10, top: 6, left: 5 }),
        boundingRect;

    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 5, 'gives the bounding rect left with absolute coords');
    assert.equal(boundingRect.width, 10, 'gives the bounding rect width with absolute coords');
    assert.equal(boundingRect.height, 10, 'gives the bounding rect height with absolute coords');
    cObj.canvas = {
       viewportTransform: [2, 0, 0, 2, 0, 0]
    };
    cObj.invalidateCoords();
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 5, 'gives the bounding rect left with absolute coords, regardless of vpt');
    assert.equal(boundingRect.width, 10, 'gives the bounding rect width with absolute coords, regardless of vpt');
    assert.equal(boundingRect.height, 10, 'gives the bounding rect height with absolute coords, regardless of vpt');
  });

  QUnit.test('getBoundingRect', function(assert) {
    var cObj = new fabric.Object({ strokeWidth: 0 }),
        boundingRect;
    assert.ok(typeof cObj.getBoundingRect === 'function');
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 0);
    assert.equal(boundingRect.top, 0);
    assert.equal(boundingRect.width, 0);
    assert.equal(boundingRect.height, 0);
    cObj.set('width', 123);
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 0);
    assert.equal(boundingRect.top, 0);
    assert.equal(boundingRect.width, 123);
    assert.equal(boundingRect.height, 0);

    cObj.set('height', 167);
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 0);
    assert.equal(Math.abs(boundingRect.top).toFixed(13), 0);
    assert.equal(boundingRect.width, 123);
    assert.equal(boundingRect.height, 167);

    cObj.scale(2, 2)
    cObj.setCoords();
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left, 0);
    assert.equal(Math.abs(boundingRect.top).toFixed(13), 0);
    assert.equal(boundingRect.width, 246);
    assert.equal(boundingRect.height, 334);
  });

  QUnit.test('getBoundingRectWithStroke', function(assert) {
    var cObj = new fabric.Object(),
        boundingRect;
    assert.ok(typeof cObj.getBoundingRect === 'function');
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left.toFixed(2), 0);
    assert.equal(boundingRect.top.toFixed(2), 0);
    assert.equal(boundingRect.width.toFixed(2), 1);
    assert.equal(boundingRect.height.toFixed(2), 1);

    cObj.set('width', 123);
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left.toFixed(2), 0);
    assert.equal(boundingRect.top.toFixed(2), 0);
    assert.equal(boundingRect.width.toFixed(2), 124);
    assert.equal(boundingRect.height.toFixed(2), 1);

    cObj.set('height', 167);
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left.toFixed(2), 0);
    assert.equal(boundingRect.top.toFixed(2), 0);
    assert.equal(boundingRect.width.toFixed(2), 124);
    assert.equal(boundingRect.height.toFixed(2), 168);

    cObj.scale(2, 2)
    cObj.setCoords();
    boundingRect = cObj.getBoundingRect();
    assert.equal(boundingRect.left.toFixed(2), 0);
    assert.equal(boundingRect.top.toFixed(2), 0);
    assert.equal(boundingRect.width.toFixed(2), 248);
    assert.equal(boundingRect.height.toFixed(2), 336);
  });

  QUnit.test('scale', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 0 });
    assert.ok(typeof cObj.scale === 'function', 'scale should exist');
  });

  QUnit.test('_constrainScale', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 0 });
    assert.ok(typeof cObj._constrainScale === 'function', '_constrainScale should exist');
    cObj.set('scaleX', 0);
    assert.equal(cObj.scaleX, 0.0001);
    cObj.set('scaleY', 0);
    assert.equal(cObj.scaleY, 0.0001);
    cObj.minScaleLimit = 3;
    cObj.set('scaleY', 0);
    assert.equal(cObj.scaleY, 3);
  });

  QUnit.test('getCoords return coordinate of object in canvas coordinate.', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40 });
    canvas.add(cObj);
    var coords = cObj.getCoords();
    assert.deepEqual(coords[0], new fabric.Point(40, 30), 'return top left corner');
    assert.deepEqual(coords[1], new fabric.Point(52, 30), 'return top right corner');
    assert.deepEqual(coords[2], new fabric.Point(52, 47), 'return bottom right corner');
    assert.deepEqual(coords[3], new fabric.Point(40, 47), 'return bottom left corner');

    cObj.left += 5;
    coords = cObj.getCoords();
    assert.deepEqual(coords[0], new fabric.Point(40, 30), 'return top left corner cached bboxCoords');
    assert.deepEqual(coords[1], new fabric.Point(52, 30), 'return top right corner cached bboxCoords');
    assert.deepEqual(coords[2], new fabric.Point(52, 47), 'return bottom right corner cached bboxCoords');
    assert.deepEqual(coords[3], new fabric.Point(40, 47), 'return bottom left corner cached bboxCoords');

    cObj.invalidateCoords();
    coords = cObj.getCoords();
    assert.deepEqual(coords[0], new fabric.Point(45, 30), 'return top left corner recalculated');
    assert.deepEqual(coords[1], new fabric.Point(57, 30), 'return top right corner recalculated');
    assert.deepEqual(coords[2], new fabric.Point(57, 47), 'return bottom right corner recalculated');
    assert.deepEqual(coords[3], new fabric.Point(45, 47), 'return bottom left corner recalculated');
  });

  QUnit.test('getCoords return coordinate of object in absolute coordinates and ignore canvas zoom', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40 });
    canvas.add(cObj);
    canvas.setViewportTransform([2, 0, 0, 2, 35, 25]);
    var coords = cObj.getCoords(true);
    assert.deepEqual(coords[0], new fabric.Point(40, 30), 'return top left corner cached controlCoords');
    assert.deepEqual(coords[1], new fabric.Point(52, 30), 'return top right corner cached controlCoords');
    assert.deepEqual(coords[2], new fabric.Point(52, 47), 'return bottom right corner cached controlCoords');
    assert.deepEqual(coords[3], new fabric.Point(40, 47), 'return bottom left corner cached controlCoords');
  });

  QUnit.test('getCoords with angle', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40, angle: 20 });
    // the viewport is non influent.
    cObj.canvas = {
      viewportTransform: [2, 0, 0, 2, 35, 25]
    };
    var coords = cObj.getCoords();
    assert.deepEqual(coords[0].x, 40, 'return top left absolute with angle X');
    assert.deepEqual(coords[1].x, 51.2763114494309, 'return top right absolute with angle X');
    assert.deepEqual(coords[2].x, 45.46196901289453, 'return bottom right absolute with angle X');
    assert.deepEqual(coords[3].x, 34.18565756346363, 'return bottom left absolute with angle X');
    assert.deepEqual(coords[0].y, 30, 'return top left absolute with angle Y');
    assert.deepEqual(coords[1].y, 34.104241719908025, 'return top right absolute with angle Y');
    assert.deepEqual(coords[2].y, 50.079016273268465, 'return bottom right absolute with angle Y');
    assert.deepEqual(coords[3].y, 45.97477455336044, 'return bottom left absolute with angle Y');
  });

  QUnit.test('getCoords with skewX', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40, skewX: 45 });
    // the viewport is non influent.
    cObj.canvas = {
      viewportTransform: [2, 0, 0, 2, 35, 25]
    };
    var coords = cObj.getCoords(true);
    assert.deepEqual(coords[0].x, 40, 'return top left absolute with skewX X');
    assert.deepEqual(coords[1].x, 69, 'return top right absolute with skewX X');
    assert.deepEqual(coords[2].x, 69, 'return bottom absolute right with skewX X');
    assert.deepEqual(coords[3].x, 40, 'return bottom absolute left with skewX X');
    assert.deepEqual(coords[0].y, 30, 'return top left absolute with skewX Y');
    assert.deepEqual(coords[1].y, 30, 'return top right absolute with skewX Y');
    assert.deepEqual(coords[2].y, 47, 'return bottom absolute right with skewX Y');
    assert.deepEqual(coords[3].y, 47, 'return bottom absolute left with skewX Y');
  });

  QUnit.test('getCoords with skewY', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40, skewY: 45 });
    // the viewport is non influent.
    cObj.canvas = {
      viewportTransform: [2, 0, 0, 2, 35, 25]
    };
    var coords = cObj.getCoords(true);
    assert.deepEqual(coords[0].x, 40, 'return top left absolute with skewY X');
    assert.deepEqual(coords[1].x, 52, 'return top right absolute with skewY X');
    assert.deepEqual(coords[2].x, 52, 'return bottom absolute right with skewY X');
    assert.deepEqual(coords[3].x, 40, 'return bottom absolute left with skewY X');
    assert.deepEqual(coords[0].y, 30, 'return top left absolute with skewY Y');
    assert.deepEqual(coords[1].y, 30, 'return top right absolute with skewY Y');
    assert.deepEqual(coords[2].y, 59, 'return bottom absolute right with skewY Y');
    assert.deepEqual(coords[3].y, 59, 'return bottom absolute left with skewY Y');
  });

  QUnit.test('getCoords with skewY skewX angle', function(assert) {
    var cObj = new fabric.Object({ width: 10, height: 15, strokeWidth: 2, top: 30, left: 40, skewY: 45, skewX: 30, angle: 90 });
    // the viewport is non influent.
    cObj.canvas = {
      viewportTransform: [2, 0, 0, 2, 35, 25]
    };
    var coords = cObj.getCoords(true);
    assert.deepEqual(coords[0].x, 40, 'return top left absolute with skewY skewX angle X');
    assert.deepEqual(coords[1].x, 40, 'return top right absolute with skewY skewX angle X');
    assert.deepEqual(coords[2].x, 11, 'return bottom absolute right with skewY skewX angle X');
    assert.deepEqual(coords[3].x, 11, 'return bottom absolute left with skewY skewX angle X');
    assert.deepEqual(coords[0].y, 30, 'return top left absolute with skewY skewX angle Y');
    assert.deepEqual(coords[1].y, 58.74315780649914, 'return top right absolute with skewY skewX angle Y');
    assert.deepEqual(coords[2].y, 58.74315780649914, 'return bottom absolute right with skewY skewX angle Y');
    assert.deepEqual(coords[3].y, 30, 'return bottom absolute left with skewY skewX angle Y');
  });

  QUnit.test('isPartiallyOnScreen', function(assert) {
    var cObj = new fabric.Object({ left: 50, top: 50, width: 100, height: 100, strokeWidth: 0});
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    cObj.canvas = canvas;
    cObj.left = -60;
    cObj.top = -60;
    cObj.invalidateCoords();
    assert.equal(cObj.isPartiallyOnScreen(true), true,'object is partially onScreen');
    cObj.left = -110;
    cObj.top = -110;
    cObj.invalidateCoords();
    assert.equal(cObj.isPartiallyOnScreen(true), false,'object is completely offScreen and not partial');
    cObj.left = 45;
    cObj.top = 45;
    cObj.invalidateCoords();
    assert.equal(cObj.isPartiallyOnScreen(true), false, 'object is completely on screen and not partial');
    canvas.setZoom(2);
    assert.equal(cObj.isPartiallyOnScreen(true), true, 'after zooming object is partially onScreen and offScreen');
  });

  QUnit.test('isPartiallyOnScreen with object inside and outside of canvas', function(assert) {
    var cObj = new fabric.Object({ left: 5, top: 5, width: 100, height: 100, strokeWidth: 0});
    cObj.canvas = new fabric.StaticCanvas(null, { width: 120, height: 120, enableRetinaScaling: false});
    assert.equal(cObj.isPartiallyOnScreen(true), false,'object is completely onScreen');
    cObj.left = -20;
    cObj.top = -20;
    cObj.scaleX = 2;
    cObj.scaleY = 2;
    cObj.invalidateCoords();
    assert.equal(cObj.isPartiallyOnScreen(true), true, 'object has all corners outside screen but contains canvas');
  });
})();
