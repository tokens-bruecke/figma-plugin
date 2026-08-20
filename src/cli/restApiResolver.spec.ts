import { describe, it, expect } from 'vitest';
import { RestAPIResolver } from './restApiResolver';

const toPaint = (node: any) =>
  RestAPIResolver.prototype.rectangleNodeToPaint.call(null, node) as any;

describe('rectangleNodeToPaint', () => {
  it('maps REST per-paint bound variables onto the style', () => {
    const style = toPaint({
      id: '1:2',
      name: 'Primary',
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0 },
          boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:3:4' } },
        },
      ],
    });

    expect(style.boundVariables.paints[0].id).toBe('VariableID:3:4');
    expect(style.paints).toHaveLength(1);
  });

  it('omits boundVariables when no paint is bound', () => {
    const style = toPaint({
      id: '1:2',
      name: 'Primary',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    });

    expect(style.boundVariables).toBeUndefined();
  });

  it('tolerates a node without fills', () => {
    expect(toPaint({ id: '1:2', name: 'Empty' }).paints).toEqual([]);
  });
});
