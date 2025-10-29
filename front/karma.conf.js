// Karma configuration file
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  const isCI = process.env.CI === 'true';

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],

    client: {
      jasmine: {
        // Exemples : random: false, seed: 4321
      },
      clearContext: false // laisse le runner visible (utile en local)
    },

    // Reporter HTML pour lecture locale sympa
    jasmineHtmlReporter: { suppressAll: true },

    // ✅ IMPORTANT : génère un lcov.info lisible par Sonar
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/bobapp'),
      subdir: '.',
      reporters: [
        { type: 'lcovonly', file: 'lcov.info' }, // <-- indispensable pour Sonar
        { type: 'html' },
        { type: 'text-summary' }
      ],
      fixWebpackSourcePaths: true
    },

    // Ajoute "coverage" pour produire le rapport ci-dessus
    reporters: ['progress', 'kjhtml', 'coverage'],

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,

    // ✅ En local : watch, non-headless ; en CI : single run, headless
    autoWatch: !isCI,
    singleRun: isCI,

    // Navigateur par défaut
    browsers: isCI ? ['ChromeHeadlessCI'] : ['Chrome'],

    // Lanceur custom pour la CI (sandbox désactivé)
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },

    // Rechargement sur modifs uniquement en local
    restartOnFileChange: !isCI
  });
};
