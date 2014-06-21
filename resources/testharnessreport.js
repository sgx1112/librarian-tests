var results_notifier = {
    addFinishedElement: function () {
        var finishedElement = document.createElement('div');
        finishedElement.setAttribute("id", "protractor-test-finished");
        document.body.appendChild(finishedElement);
    },
    ajaxPost: function (url, data) {
        var params = "";
        var keyCount = 0;
        var response = "";

        try {
            if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
                xmlhttp = new XMLHttpRequest();
            } else {// code for IE6, IE5
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }

            xmlhttp.open("POST", url, false);
            xmlhttp.setRequestHeader("Content-type", "application/json");
            xmlhttp.send(data);

            response = xmlhttp.responseText;
        }
        catch (e) {
            response = e.message;
        }

        return response;
    },
    sendTestResults: function (tests, apiUrl) {
        var apiTestStatuses = {
            Unknown: 0,
            Failed: 1,
            Passed: 2,
            ManualCheckNeeded: 3,
            Timeout: 4,
            NotRun: 5
        };

        var Test = {
            statuses: {
                PASS: 0,
                FAIL: 1,
                TIMEOUT: 2,
                NOTRUN: 3
            }
        };

        var statusTranslation = {};
        statusTranslation[Test.statuses.PASS] = apiTestStatuses.Passed;
        statusTranslation[Test.statuses.FAIL] = apiTestStatuses.Failed;
        statusTranslation[Test.statuses.TIMEOUT] = apiTestStatuses.Timeout;
        statusTranslation[Test.statuses.NOTRUN] = apiTestStatuses.NotRun;

        var requests = 0;
        var testResult;
        var test;
        var totalTests = tests.length;
        var testIndex;
        var testFileResults = {
            ExpectedResults: totalTests,
            Results: []
        };

        for (testIndex = 0; testIndex < totalTests; testIndex++) {
            testResult = {};
            test = tests[testIndex];

            testResult.Name = test.name;
            testResult.Status = statusTranslation[test.status];
            testResult.Comments = test.message;

            testFileResults.Results.push(testResult);

            if (testIndex > 1 && ((testIndex % 1000) == 0)) {
                results_notifier.ajaxPost(apiUrl, JSON.stringify(testFileResults));
                testFileResults = {
                    ExpectedResults: totalTests,
                    Results: []
                };
                requests++;
            }
        }

        results_notifier.ajaxPost(apiUrl, JSON.stringify(testFileResults));
        results_notifier.addFinishedElement();
    },
    sendTestResultsToSuiteTracker: function (tests, suiteTrackerUrl) {
        var regex = new RegExp("[\\?&]runid=([^&#]*)");
        var finds = regex.exec(window.location.search.toLowerCase());
        if (finds != null) {
            var runId = parseInt(decodeURIComponent(finds[1].replace(/\+/g, " ")));
            if (!isNaN(runId) && runId > 0)
                suiteTrackerUrl += runId.toString();
            else
                return;
        }
        else {
            return;
        }

        var url = window.location.href.toLowerCase().split('?')[0];
        var testGroup = {};
        testGroup.type = "group";
        testGroup.name = window.location.pathname.toLowerCase();
        testGroup.url = url;
        testGroup.tests = new Array();
        for (var i = 0; i < tests.length; i++) {
            var test = {};
            test.type = "test";
            test.name = tests[i].name;
            test.url = url;
            test.result = tests[i].status == 0 ? "pass" : "fail"; //TODO
            test.message = tests[i].message == null ? "" : tests[i].message;
            testGroup.tests.push(test);
        }

        var testFileResults = new Array();
        testFileResults.push(testGroup);

        var jsonResult = JSON.stringify(testFileResults);
        var postData = { results: jsonResult };

        results_notifier.ajaxPost(suiteTrackerUrl, JSON.stringify(postData));
        results_notifier.addFinishedElement();
    },
    setup: function () {
        add_completion_callback(
            function (tests, harness_status) {
                var apiUrl = '#REPORT API URL HERE';
                results_notifier.sendTestResults(tests, apiUrl);
                var suiteTrackerUrl = 'http://IEPortal/SuiteTracker/ConformanceRuns/UploadPartial/';
                results_notifier.sendTestResultsToSuiteTracker(tests, suiteTrackerUrl);
            });
    }
};

results_notifier.setup();
