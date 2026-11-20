import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeExternalUrl, sanitizePostgrestSearch } from '../src/utils/url.ts';

describe('URL & PostgREST Filter Sanitization', () => {
  it('blocks javascript:, data:, and vbscript: URLs while allowing http(s)', () => {
    assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeExternalUrl('JAVASCRIPT:alert(document.cookie)'), null);
    assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(sanitizeExternalUrl('vbscript:msgbox(1)'), null);
    assert.equal(sanitizeExternalUrl(''), null);
    assert.equal(sanitizeExternalUrl(null), null);

    assert.equal(
      sanitizeExternalUrl('https://github.com/IdeoraHQ'),
      'https://github.com/IdeoraHQ'
    );
    assert.equal(
      sanitizeExternalUrl('http://example.com/portfolio'),
      'http://example.com/portfolio'
    );
    assert.equal(
      sanitizeExternalUrl('github.com/IdeoraHQ'),
      'https://github.com/IdeoraHQ'
    );
  });

  it('strips PostgREST .or() filter syntax characters from search queries', () => {
    assert.equal(
      sanitizePostgrestSearch('fintech,id.eq.123(test)%_\\*'),
      'fintech id.eq.123 test'
    );
    assert.equal(sanitizePostgrestSearch('  AI & Robotics  '), 'AI & Robotics');
    assert.equal(sanitizePostgrestSearch(undefined), '');
  });
});
