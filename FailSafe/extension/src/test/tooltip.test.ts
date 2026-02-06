import { describe, it } from 'mocha';
import * as assert from 'assert';
import { tooltipAttrs } from '../shared/components/Tooltip';

describe('tooltipAttrs', () => {
  it('escapes tooltip text for data attributes', () => {
    const attrs = tooltipAttrs('A "quote" & <tag>');
    assert.strictEqual(
      attrs,
      'data-tooltip="A &quot;quote&quot; &amp; &lt;tag&gt;" aria-label="A &quot;quote&quot; &amp; &lt;tag&gt;"'
    );
  });

  it('returns empty string for empty tooltip', () => {
    assert.strictEqual(tooltipAttrs(''), '');
  });
});
