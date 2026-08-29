// Starts the Firebase Emulator Suite; works on Windows without a system Java.
// Looks for Java on PATH, then JAVA_HOME, then a portable JRE in
// %LOCALAPPDATA%\deti-tools (see README for the download command).
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, delimiter } from 'node:path';

function javaOnPath() {
  const probe = spawnSync('java', ['-version'], { shell: true, stdio: 'ignore' });
  return probe.status === 0;
}

function portableJavaBin() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(join(process.env.JAVA_HOME, 'bin'));
  const tools = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'deti-tools')
    : null;
  if (tools && existsSync(tools)) {
    for (const entry of readdirSync(tools)) {
      if (/^jdk|^jre/i.test(entry)) candidates.push(join(tools, entry, 'bin'));
    }
  }
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  return candidates.find((dir) => existsSync(join(dir, exe)));
}

const env = { ...process.env };
if (!javaOnPath()) {
  const bin = portableJavaBin();
  if (!bin) {
    console.error(
      'Java not found (the Firestore emulator needs it).\n' +
        'Install it, or download a portable JRE with PowerShell:\n\n' +
        '  $d = "$env:LOCALAPPDATA\\deti-tools"; New-Item -ItemType Directory -Force $d | Out-Null;\n' +
        '  Invoke-WebRequest "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse" -OutFile "$d\\jre.zip";\n' +
        '  Expand-Archive "$d\\jre.zip" $d; Remove-Item "$d\\jre.zip"\n',
    );
    process.exit(1);
  }
  env.PATH = `${bin}${delimiter}${env.PATH ?? ''}`;
  console.log(`Using portable Java from ${bin}`);
}

const child = spawn('npx firebase emulators:start --project demo-deti', {
  shell: true,
  stdio: 'inherit',
  env,
});
child.on('exit', (code) => process.exit(code ?? 0));
