import { CountKeyPipe } from './count-key.pipe';

describe('CountKeyPipe', () => {
  const pipe = new CountKeyPipe();

  it('picks the singular key for exactly one', () => {
    expect(pipe.transform('KPI.SUBTITLE', 1)).toBe('KPI.SUBTITLE_ONE');
  });

  it('keeps the plural key for zero and many', () => {
    expect(pipe.transform('KPI.SUBTITLE', 0)).toBe('KPI.SUBTITLE');
    expect(pipe.transform('KPI.SUBTITLE', 2)).toBe('KPI.SUBTITLE');
  });
});
