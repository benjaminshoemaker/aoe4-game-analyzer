import * as fs from 'fs';
import * as path from 'path';
import { makeMvpModelFixture } from '../__tests__/helpers/mvpModelFixture';
import { renderPostMatchHtml } from '../src/lib/aoe4/formatters/postMatchHtml';

const html = renderPostMatchHtml(makeMvpModelFixture(), { hoverDataUrl: '/dummy-hover-data' });
const out = path.resolve(__dirname, '../../../tmp/aoe4-match-fixture.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote', html.length, 'bytes to', out);
