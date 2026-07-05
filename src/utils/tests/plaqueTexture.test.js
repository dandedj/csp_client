import { splitLines, computePlaqueLayout } from '../plaqueTexture';

// A deterministic, linear stand-in for canvas measureText: width scales with
// both character count and font size. This lets the layout maths be tested
// without a real 2-D context (jsdom has none).
const K = 0.5;
const measure = (line, fontSize) => line.length * fontSize * K;

const WIDTH = 512;
const PADDING = Math.round(WIDTH * 0.09); // 46
const MAX_TEXT_WIDTH = WIDTH - PADDING * 2; // 420

describe('splitLines', () => {
  it('keeps interior blank lines but trims leading/trailing ones', () => {
    expect(splitLines('\n\nHello\n\nWorld\n\n')).toEqual(['Hello', '', 'World']);
  });

  it('normalises CRLF line endings', () => {
    expect(splitLines('a\r\nb')).toEqual(['a', 'b']);
  });

  it('always yields at least one line', () => {
    expect(splitLines('')).toEqual(['']);
    expect(splitLines(null)).toEqual(['']);
  });
});

describe('computePlaqueLayout', () => {
  it('clamps the font for short text so it does not balloon', () => {
    const layout = computePlaqueLayout('Hi', WIDTH, measure);
    expect(layout.fontSize).toBe(54); // maxFont
    expect(layout.lines).toHaveLength(1);
    expect(layout.width).toBe(WIDTH);
  });

  it('shrinks the font so a long line fits the text box', () => {
    const line = 'x'.repeat(30); // fontSize solves to exactly 28 with this measurer
    const layout = computePlaqueLayout(line, WIDTH, measure);
    expect(layout.fontSize).toBe(28);
    expect(measure(line, layout.fontSize)).toBeLessThanOrEqual(MAX_TEXT_WIDTH);
  });

  it('never shrinks below the minimum font, even for very long lines', () => {
    const layout = computePlaqueLayout('x'.repeat(60), WIDTH, measure);
    expect(layout.fontSize).toBe(20); // minFont
  });

  it('grows the canvas height with the number of lines', () => {
    const one = computePlaqueLayout('A', WIDTH, measure);
    const three = computePlaqueLayout('A\nB\nC', WIDTH, measure);
    expect(three.lines).toHaveLength(3);
    expect(three.height).toBeGreaterThan(one.height);
  });

  it('reports aspect as height over width', () => {
    const layout = computePlaqueLayout('A\nB\nC\nD', WIDTH, measure);
    expect(layout.aspect).toBeCloseTo(layout.height / layout.width, 9);
  });

  it('enforces a minimum aspect so one-word plaques are not slivers', () => {
    const layout = computePlaqueLayout('Oak', WIDTH, measure);
    expect(layout.height).toBeGreaterThanOrEqual(Math.round(WIDTH * 0.42));
  });
});
