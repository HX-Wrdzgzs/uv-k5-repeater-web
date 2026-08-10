import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PUBLIC_ARTIFACTS = [
  'firmware.bin',
  'firmware.packed.bin',
  'firmware.stable.bin',
  'firmware.stable.packed.bin',
  'repeaters.bin',
  'repeaters.stable.bin',
  'repeaters_manifest.json',
  'repeaters.build.json',
];

const PRIVATE_TAIL_ARTIFACTS = ['tails.bin', 'tails.stable.bin'];
const FIRMWARE_ARTIFACTS = PUBLIC_ARTIFACTS.filter((name) => name.startsWith('firmware.'));

function printUsage() {
  console.log(`Usage: node scripts/package-firmware-release.mjs --source <firmware-dir> --output <release-dir>

Copies only public firmware release artifacts. Personal tail-tone resources are
intentionally excluded; the source directory is never modified.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      printUsage();
      process.exit(0);
    }
    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${argument}`);
    }
    args[argument.slice(2)] = value;
    index += 1;
  }
  if (!args.source || !args.output) {
    printUsage();
    throw new Error('Both --source and --output are required.');
  }
  return args;
}

function isSameOrInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function ensureDirectory(directory, label) {
  if (!fs.existsSync(directory)) {
    throw new Error(`${label} does not exist: ${directory}`);
  }
  if (!fs.statSync(directory).isDirectory()) {
    throw new Error(`${label} is not a directory: ${directory}`);
  }
}

function copyIfPresent(sourceDirectory, outputDirectory, filename) {
  const sourcePath = path.join(sourceDirectory, filename);
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  if (!fs.statSync(sourcePath).isFile()) {
    throw new Error(`Expected a file but found another entry: ${sourcePath}`);
  }
  fs.copyFileSync(sourcePath, path.join(outputDirectory, filename));
  return true;
}

function removeStalePrivateArtifact(outputDirectory, filename) {
  const outputPath = path.join(outputDirectory, filename);
  if (!fs.existsSync(outputPath)) {
    return false;
  }
  if (!fs.statSync(outputPath).isFile()) {
    throw new Error(`Refusing to remove non-file release entry: ${outputPath}`);
  }
  fs.rmSync(outputPath);
  return true;
}

function main() {
  const { source, output } = parseArgs(process.argv.slice(2));
  const sourceDirectory = path.resolve(source);
  const outputDirectory = path.resolve(output);

  ensureDirectory(sourceDirectory, 'Source directory');
  if (isSameOrInside(outputDirectory, sourceDirectory)) {
    throw new Error('Output directory must be outside the firmware source directory.');
  }

  fs.mkdirSync(outputDirectory, { recursive: true });

  const copied = PUBLIC_ARTIFACTS.filter((filename) =>
    copyIfPresent(sourceDirectory, outputDirectory, filename),
  );
  const removedStale = PRIVATE_TAIL_ARTIFACTS.filter((filename) =>
    removeStalePrivateArtifact(outputDirectory, filename),
  );
  const excluded = PRIVATE_TAIL_ARTIFACTS.filter((filename) =>
    fs.existsSync(path.join(sourceDirectory, filename)),
  );

  if (!copied.some((filename) => FIRMWARE_ARTIFACTS.includes(filename))) {
    throw new Error('No firmware binary was found in the source directory.');
  }

  console.log(`Public artifacts copied: ${copied.length}`);
  copied.forEach((filename) => console.log(`  included: ${filename}`));
  excluded.forEach((filename) => console.log(`  excluded: ${filename}`));
  removedStale.forEach((filename) => console.log(`  removed stale release copy: ${filename}`));
  console.log(`Release directory: ${outputDirectory}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
