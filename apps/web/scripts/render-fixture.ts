import * as fs from 'fs';
import * as path from 'path';
import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../__tests__/helpers/mvpModelFixture';

const html = renderPostMatchHtml(makeMvpModelFixture());
const out = path.resolve(__dirname, '../../../tmp/aoe4-match-fixture.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote', html.length, 'bytes to', out);
