'use strict';

var AllureSuite = require('allure-js-commons').Suite,
    mochaUtils = require('./lib/mocha-utils'),
    RunningSuites = require('./lib/running-suites'),
    SuiteAdapter = require('./lib/suite-adapter');

module.exports = function(hermione, opts) {
    var ALLURE_STATUS = {
            passed: 'passed',
            failed: 'failed',
            pending: 'pending',
            broken: 'broken'
        },
        _runningSuites = new RunningSuites(),
        targetDir = opts.targetDir ? opts.targetDir : 'allure-results';

    hermione.on(hermione.events.SUITE_BEGIN, function(suite) {
        if (!mochaUtils.isTopSuite(suite)) {
            return;
        }

        if (!_runningSuites.getSuite(suite.title, suite.browserId)) {
            _runningSuites.addSuite(new AllureSuite(suite.title), suite.browserId);
        }
    });

    hermione.on(hermione.events.SUITE_END, function(suite) {
        if (!mochaUtils.isTopSuite(suite)) {
            return;
        }
        var runningSuite = _runningSuites.getSuite(suite.title, suite.browserId);
        if (runningSuite) {
            runningSuite.endSuite(targetDir);
            _runningSuites.removeSuite(suite.title, suite.browserId);
        }
    });

    hermione.on(hermione.events.TEST_BEGIN, function(test) {
        _runningSuites.startTest(test);
    });

    hermione.on(hermione.events.TEST_PASS, function _onTestPass(test) {
        _runningSuites.finishTest(test, ALLURE_STATUS.passed);
    });

    hermione.on(hermione.events.TEST_FAIL, function(test) {
        _runningSuites.finishTest(test, ALLURE_STATUS.failed, test.err);
    });

    hermione.on(hermione.events.TEST_PENDING, function(test) {
        var runningSuite = _runningSuites.getSuiteByTest(test);
        runningSuite.addTest(test);
        runningSuite.finishTest(test, ALLURE_STATUS.pending, {message: 'Test ignored'});
    });

    hermione.on(hermione.events.ERROR, function(err, data) {
        if (data && mochaUtils.isBeforeHook(data)) {
            var suiteAdapter = new SuiteAdapter(new AllureSuite(data.parent.title), data.browserId);
            mochaUtils.getAllSuiteTests(data.parent).forEach(function(test) {
                suiteAdapter.addTest(test);
                suiteAdapter.finishTest(test, ALLURE_STATUS.broken, err);
            });
            suiteAdapter.endSuite(targetDir);
        }
    });
};