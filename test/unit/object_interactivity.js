(function() {

  QUnit.module('fabric.ObjectInteractivity');

  QUnit.test('isControlVisible', function(assert) {
    assert.ok(fabric.Object);

    var cObj = new fabric.Object({ });
    assert.ok(typeof cObj.isControlVisible === 'function', 'isControlVisible should exist');

    assert.equal(cObj.isControlVisible('tl'), true);
    assert.equal(cObj.isControlVisible('tr'), true);
    assert.equal(cObj.isControlVisible('br'), true);
    assert.equal(cObj.isControlVisible('bl'), true);
    assert.equal(cObj.isControlVisible('ml'), true);
    assert.equal(cObj.isControlVisible('mt'), true);
    assert.equal(cObj.isControlVisible('mr'), true);
    assert.equal(cObj.isControlVisible('mb'), true);
    assert.equal(cObj.isControlVisible('mtr'), true);
  });

  QUnit.test('setControlVisible', function(assert) {
    assert.ok(fabric.Object);

    var cObj = new fabric.Object({ });
    assert.ok(typeof cObj.setControlVisible === 'function', 'setControlVisible should exist');
    cObj.setControlVisible('tl', false);
    assert.equal(cObj.isControlVisible('tl'), false);
    cObj.setControlVisible('tl', true);
    assert.equal(cObj.isControlVisible('tl'), true);
  });

  QUnit.test('setControlVisible is per object', function(assert) {
    assert.ok(fabric.Object);

    var cObj = new fabric.Object({ });
    var cObj2 = new fabric.Object({ });

    cObj.setControlVisible('tl', false);
    assert.equal(cObj.isControlVisible('tl'), false, 'setting to false worked for cObj');
    assert.equal(cObj2.isControlVisible('tl'), true, 'setting to false did not work for cObj2');
    cObj.controls.tl.setVisibility(false);
    assert.equal(cObj2.isControlVisible('tl'), true, 'setting directly on controls does not affect other objects');
    cObj.setControlVisible('tl', true);
    assert.equal(cObj.isControlVisible('tl'), true, 'object setting takes precedence');
    // restore original visibility
    cObj.controls.tl.setVisibility(true);
  });

  QUnit.test('setControlsVisibility', function(assert) {
    assert.ok(fabric.Object);

    var cObj = new fabric.Object({ });
    assert.ok(typeof cObj.setControlsVisibility === 'function', 'setControlsVisibility should exist');
    cObj.setControlsVisibility({
      bl: false,
      br: false,
      mb: false,
      ml: false,
      mr: false,
      mt: false,
      tl: false,
      tr: false,
      mtr: false
    });

    assert.equal(cObj.isControlVisible('tl'), false);
    assert.equal(cObj.isControlVisible('tr'), false);
    assert.equal(cObj.isControlVisible('br'), false);
    assert.equal(cObj.isControlVisible('bl'), false);
    assert.equal(cObj.isControlVisible('ml'), false);
    assert.equal(cObj.isControlVisible('mt'), false);
    assert.equal(cObj.isControlVisible('mr'), false);
    assert.equal(cObj.isControlVisible('mb'), false);
    assert.equal(cObj.isControlVisible('mtr'), false);

    cObj.setControlsVisibility({
      bl: true,
      br: true,
      mb: true,
      ml: true,
      mr: true,
      mt: true,
      tl: true,
      tr: true,
      mtr: true
    });

    assert.equal(cObj.isControlVisible('tl'), true);
    assert.equal(cObj.isControlVisible('tr'), true);
    assert.equal(cObj.isControlVisible('br'), true);
    assert.equal(cObj.isControlVisible('bl'), true);
    assert.equal(cObj.isControlVisible('ml'), true);
    assert.equal(cObj.isControlVisible('mt'), true);
    assert.equal(cObj.isControlVisible('mr'), true);
    assert.equal(cObj.isControlVisible('mb'), true);
    assert.equal(cObj.isControlVisible('mtr'), true);
  });

  QUnit.test('corner coords', function(assert) {
    var cObj = new fabric.Object({ top: 10, left: 10, width: 10, height: 10, strokeWidth: 0, canvas: {} });
    cObj.setCoords();

    assert.equal(cObj.oCoords.tl.corner.tl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.tl.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.tr.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.tr.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.bl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.bl.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.br.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.br.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.bl.corner.tl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.bl.corner.tl.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.bl.corner.tr.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.bl.corner.tr.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.bl.corner.bl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.bl.corner.bl.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.bl.corner.br.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.bl.corner.br.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.tr.corner.tl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.tr.corner.tl.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tr.corner.tr.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.tr.corner.tr.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tr.corner.bl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.tr.corner.bl.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tr.corner.br.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.tr.corner.br.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.br.corner.tl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.tl.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.tr.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.tr.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.bl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.bl.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.br.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.br.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.mtr.corner.tl.x.toFixed(2), 8.5);
    assert.equal(cObj.oCoords.mtr.corner.tl.y.toFixed(2), -36.5);
    assert.equal(cObj.oCoords.mtr.corner.tr.x.toFixed(2), 21.5);
    assert.equal(cObj.oCoords.mtr.corner.tr.y.toFixed(2), -36.5);
    assert.equal(cObj.oCoords.mtr.corner.bl.x.toFixed(2), 8.5);
    assert.equal(cObj.oCoords.mtr.corner.bl.y.toFixed(2), -23.5);
    assert.equal(cObj.oCoords.mtr.corner.br.x.toFixed(2), 21.5);
    assert.equal(cObj.oCoords.mtr.corner.br.y.toFixed(2), -23.5);

  });

  // set size for bottom left corner and have different results for bl than normal setCornerCoords test
  QUnit.test('corner coords: custom control size', function(assert) {
    //set custom corner size
    const sharedControls = fabric.Object.getDefaults().controls;
    sharedControls.bl.sizeX = 30;
    sharedControls.bl.sizeY = 10;

    var cObj = new fabric.Object({ top: 10, left: 10, width: 10, height: 10, strokeWidth: 0, controls: sharedControls, canvas: {} });
    cObj.setCoords();

    assert.equal(cObj.oCoords.tl.corner.tl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.tl.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.tr.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.tr.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.bl.x.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tl.corner.bl.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.br.x.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tl.corner.br.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.bl.corner.tl.x.toFixed(2), -5.0);
    assert.equal(cObj.oCoords.bl.corner.tl.y.toFixed(2), 15.0);
    assert.equal(cObj.oCoords.bl.corner.tr.x.toFixed(2), 25.0);
    assert.equal(cObj.oCoords.bl.corner.tr.y.toFixed(2), 15.0);
    assert.equal(cObj.oCoords.bl.corner.bl.x.toFixed(2), -5.0);
    assert.equal(cObj.oCoords.bl.corner.bl.y.toFixed(2), 25.0);
    assert.equal(cObj.oCoords.bl.corner.br.x.toFixed(2), 25.0);
    assert.equal(cObj.oCoords.bl.corner.br.y.toFixed(2), 25.0);
    assert.equal(cObj.oCoords.tr.corner.tl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.tr.corner.tl.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tr.corner.tr.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.tr.corner.tr.y.toFixed(2), 3.5);
    assert.equal(cObj.oCoords.tr.corner.bl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.tr.corner.bl.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.tr.corner.br.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.tr.corner.br.y.toFixed(2), 16.5);
    assert.equal(cObj.oCoords.br.corner.tl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.tl.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.tr.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.tr.y.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.bl.x.toFixed(2), 13.5);
    assert.equal(cObj.oCoords.br.corner.bl.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.br.x.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.br.corner.br.y.toFixed(2), 26.5);
    assert.equal(cObj.oCoords.mtr.corner.tl.x.toFixed(2), 8.5);
    assert.equal(cObj.oCoords.mtr.corner.tl.y.toFixed(2), -36.5);
    assert.equal(cObj.oCoords.mtr.corner.tr.x.toFixed(2), 21.5);
    assert.equal(cObj.oCoords.mtr.corner.tr.y.toFixed(2), -36.5);
    assert.equal(cObj.oCoords.mtr.corner.bl.x.toFixed(2), 8.5);
    assert.equal(cObj.oCoords.mtr.corner.bl.y.toFixed(2), -23.5);
    assert.equal(cObj.oCoords.mtr.corner.br.x.toFixed(2), 21.5);
    assert.equal(cObj.oCoords.mtr.corner.br.y.toFixed(2), -23.5);

    // reset
    sharedControls.bl.sizeX = null;
    sharedControls.bl.sizeY = null;
  });

  QUnit.test('findControl', function(assert) {
    var cObj = new fabric.Object({ top: 10, left: 10, width: 30, height: 30, strokeWidth: 0, canvas: {}});
    assert.ok(typeof cObj.findControl === 'function', 'findControl should exist');
    cObj.setCoords();
    cObj.canvas = {
      getActiveObject() { return cObj }
    };
    assert.deepEqual(cObj.findControl(cObj.oCoords.br), { key: 'br', control: cObj.controls.br, coord: cObj.oCoords.br });
    assert.deepEqual(cObj.findControl(cObj.oCoords.tl), { key: 'tl', control: cObj.controls.tl, coord: cObj.oCoords.tl });
    assert.deepEqual(cObj.findControl(cObj.oCoords.tr), { key: 'tr', control: cObj.controls.tr, coord: cObj.oCoords.tr });
    assert.deepEqual(cObj.findControl(cObj.oCoords.bl), { key: 'bl', control: cObj.controls.bl, coord: cObj.oCoords.bl });
    assert.deepEqual(cObj.findControl(cObj.oCoords.mr), { key: 'mr', control: cObj.controls.mr, coord: cObj.oCoords.mr });
    assert.deepEqual(cObj.findControl(cObj.oCoords.ml), { key: 'ml', control: cObj.controls.ml, coord: cObj.oCoords.ml });
    assert.deepEqual(cObj.findControl(cObj.oCoords.mt), { key: 'mt', control: cObj.controls.mt, coord: cObj.oCoords.mt });
    assert.deepEqual(cObj.findControl(cObj.oCoords.mb), { key: 'mb', control: cObj.controls.mb, coord: cObj.oCoords.mb });
    assert.deepEqual(cObj.findControl(cObj.oCoords.mtr), { key: 'mtr', control: cObj.controls.mtr, coord: cObj.oCoords.mtr });
    assert.deepEqual(cObj.findControl(new fabric.Point()), undefined);
  });

  QUnit.test('findControl for touches', function(assert) {
    var cObj = new fabric.Object({ top: 10, left: 10, width: 30, height: 30, strokeWidth: 0, canvas: {} });
    cObj.setCoords();
    cObj.canvas = {
      getActiveObject() { return cObj }
    };
    var pointNearBr = new fabric.Point({
      x: cObj.oCoords.br.x + cObj.cornerSize / 3,
      y: cObj.oCoords.br.y + cObj.cornerSize / 3
    });
    assert.equal(cObj.findControl(pointNearBr).key, 'br', 'cornerSize/3 near br returns br');
    assert.equal(cObj.findControl(pointNearBr, true).key, 'br', 'touch event cornerSize/3 near br returns br');
    pointNearBr = new fabric.Point({
      x: cObj.oCoords.br.x + cObj.touchCornerSize / 3,
      y: cObj.oCoords.br.y + cObj.touchCornerSize / 3,
    });
    assert.equal(cObj.findControl(pointNearBr, true).key, 'br', 'touch event touchCornerSize/3 near br returns br');
    assert.equal(cObj.findControl(pointNearBr, false), undefined, 'not touch event touchCornerSize/3 near br returns false');
  });


  QUnit.test('findControl for non active object', function (assert) {
    var cObj = new fabric.Object({ top: 10, left: 10, width: 30, height: 30, strokeWidth: 0, canvas: {} });
    assert.ok(typeof cObj.findControl === 'function', 'findControl should exist');
    cObj.setCoords();
    cObj.canvas = {
      getActiveObject() { return }
    };
    assert.equal(cObj.findControl(cObj.oCoords.mtr), undefined, 'object is not active');
  });

  QUnit.test('findControl for non visible control', function (assert) {
    var cObj = new fabric.Object({ top: 10, left: 10, width: 30, height: 30, strokeWidth: 0, canvas: {} });
    assert.ok(typeof cObj.findControl === 'function', 'findControl should exist');
    cObj.setCoords();
    cObj.canvas = {
      getActiveObject() { return cObj }
    };
    cObj.isControlVisible = () => false;
    assert.equal(cObj.findControl(cObj.oCoords.mtr), undefined, 'object is not active');
  });

})();
