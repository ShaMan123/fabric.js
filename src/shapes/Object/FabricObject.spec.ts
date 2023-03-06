import { FabricObject } from './FabricObject';

describe('FabricObject', () => {
  it('setCoords should calculate control coords only if canvas ref is set', () => {
    const object = new FabricObject();
    expect(object['cornerCoords']).toBeUndefined();
    expect(object['controlCoords']).toBeUndefined();
    object.setCoords();
    expect(object['cornerCoords']).toBeDefined();
    expect(object['controlCoords']).toBeUndefined();
    object.canvas = jest.fn();
    object.setCoords();
    expect(object['cornerCoords']).toBeDefined();
    expect(object['controlCoords']).toBeDefined();
  });
});
