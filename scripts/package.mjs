import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputs = await packager({
  dir: root, out: path.join(root, 'release'), name: 'After You',
  platform: 'darwin', arch: 'arm64', electronVersion: '44.2.0',
  appBundleId: 'com.chrisdimarco.afteryou', appCategoryType: 'public.app-category.board-games',
  appCopyright: 'Copyright © 2026 Chris DiMarco',
  icon: path.join(root, 'assets/app-icon.icns'),
  overwrite: true, prune: true, asar: true,
  ignore: [/^\/release(?:\/|$)/, /^\/artifacts(?:\/|$)/, /^\/tests(?:\/|$)/, /^\/scripts(?:\/|$)/, /^\/tools(?:\/|$)/, /^\/assets\/app-icon\.iconset(?:\/|$)/, /\.swift$/, /^\/\.(?:git|DS_Store)/, /\.md$/],
});
for (const output of outputs) {
  const application = path.join(output, 'After You.app');
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', application], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', application], { stdio: 'inherit' });
  console.log(`Packaged and verified: ${application}`);
}
