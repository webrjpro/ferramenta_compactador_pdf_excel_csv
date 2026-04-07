import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const REQUIRED_MODULES = [
  'src/core/app-core.js',
  'src/tools/report/report-app.js',
  'src/tools/csv/csv-app.js'
];

const checks = [
  {
    name: 'index.html references physical JS modules',
    run() {
      const html = readFileSync('index.html', 'utf-8');
      assert.match(html, /<script src="\.\/src\/core\/app-core\.js"><\/script>/);
      assert.match(html, /<script src="\.\/src\/tools\/report\/report-app\.js"><\/script>/);
      assert.match(html, /<script src="\.\/src\/tools\/csv\/csv-app\.js"><\/script>/);
    }
  },
  {
    name: 'physical JS modules exist',
    run() {
      for (const filePath of REQUIRED_MODULES) {
        assert.equal(existsSync(filePath), true, `Expected module file: ${filePath}`);
      }
    }
  },
  {
    name: 'physical JS modules pass syntax check',
    run() {
      for (const filePath of REQUIRED_MODULES) {
        const source = readFileSync(filePath, 'utf-8');
        assert.doesNotThrow(
          () => new vm.Script(source, { filename: filePath }),
          `Syntax check failed for ${filePath}`
        );
      }
    }
  },
  {
    name: 'index.html critical routes are valid and readable',
    run() {
      const html = readFileSync('index.html', 'utf-8');
      assert.match(html, /href="\.\/escala_presença\.html"/, 'Missing or broken Escala route');
      assert.match(html, /href="\.\/red\.html"/, 'Missing RED route');
      assert.match(html, /Organizador Automático de Alunos/, 'Homepage title text is corrupted');
    }
  },
  {
    name: 'red.html uses dedicated root assets',
    run() {
      const html = readFileSync('red.html', 'utf-8');
      assert.match(html, /<link rel="stylesheet" href="\.\/stylesred\.css"/);
      assert.match(html, /<script src="\.\/red\.js"><\/script>/);
      assert.equal(existsSync('stylesred.css'), true, 'Missing stylesred.css');
      assert.equal(existsSync('red.js'), true, 'Missing red.js');
    }
  },
  {
    name: 'service worker cache list is aligned with RED assets',
    run() {
      const sw = readFileSync('sw.js', 'utf-8');
      assert.match(sw, /'\.\/red\.html'/);
      assert.match(sw, /'\.\/stylesred\.css'/);
      assert.match(sw, /'\.\/red\.js'/);
      assert.doesNotMatch(sw, /red-page\.css/);
      assert.doesNotMatch(sw, /red-page\.js/);
    }
  },
  {
    name: 'global integration contracts are exposed',
    run() {
      const csv = readFileSync('src/tools/csv/csv-app.js', 'utf-8');
      const report = readFileSync('src/tools/report/report-app.js', 'utf-8');
      assert.match(csv, /window\.CsvApp\s*=\s*CsvApp/);
      assert.match(report, /window\.ReportApp\s*=\s*ReportApp/);
      assert.match(report, /window\.handleSmartCsvUpload\s*=\s*handleSmartCsvUpload/);
    }
  }
];

let failures = 0;
for (const check of checks) {
  try {
    check.run();
    process.stdout.write(`PASS: ${check.name}\n`);
  } catch (error) {
    failures += 1;
    process.stderr.write(`FAIL: ${check.name}\n${error.stack}\n`);
  }
}

if (failures > 0) {
  process.stderr.write(`\nSmoke finished with ${failures} failure(s).\n`);
  process.exit(1);
}

process.stdout.write('\nSmoke finished successfully.\n');
