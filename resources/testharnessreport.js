var results_notifier = {
    addFinishedElement: function () {
        var finishedElement = document.createElement('div');
        finishedElement.setAttribute("id", "protractor-test-finished");
        document.body.appendChild(finishedElement);
    },
    getParamValue: function (name) {
        var val = null;
        var regex = new RegExp("[\\?&]" + name.toLowerCase() + "=([^&#]*)");
        var finds = regex.exec(window.location.search.toLowerCase());
        if (finds != null) {
            val = decodeURIComponent(finds[1].replace(/\+/g, " "));
        }
        return val;
    },
    corsRequest: function (method, url) {
        var xhr = null;
        if (window.XMLHttpRequest) {
            // XHR for IE7+, Firefox, Chrome, Opera, Safari
            xhr = new XMLHttpRequest();
            if ("withCredentials" in xhr) {
                // XHR for Chrome/Firefox/Opera/Safari.
                xhr.open(method, url, false);
                xhr.withCredentials = true;
            } else if (typeof XDomainRequest != "undefined") {
                // XDomainRequest for IE.
                xhr = new XDomainRequest();
                xhr.open(method, url);
            }
        } else {
            // XHR for IE6, IE5
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
            xmlhttp.open(method, url, false);
        }
        return xhr;
    },
    ajaxPost: function (url, data) {
        var params = "";
        var keyCount = 0;
        var response = null;
        try {
            var xhr = results_notifier.corsRequest("POST", url);
            if (!xhr) throw new Error('CORS not supported');
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
            response = xhr.responseText;
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
        //results_notifier.addFinishedElement();
    },
    reportToSuiteTracker: function (tests, suiteTrackerUrl) {
        var url = window.location.href.toLowerCase().split('?')[0];
        var testGroup = {};
        testGroup.type = "group";
        testGroup.name = window.location.pathname.toLowerCase();
        testGroup.url = url;
        testGroup.tests = new Array();
        for (var i = 0; i < tests.length; i++) {
            var test = {};
            test.type = "test";
            test.name = tests[i].name.replace(/\"/g, "'");
            test.url = url;
            test.result = tests[i].status == 0 ? "pass" : "fail"; //TODO
            test.message = tests[i].message == null ? "" : tests[i].message.replace(/\"/g, "'");
            testGroup.tests.push(test);
        }

        var testFileResults = new Array();
        testFileResults.push(testGroup);

        var jsonResult = JSON.stringify(testFileResults);
        var postData = { results: jsonResult };

        results_notifier.ajaxPost(suiteTrackerUrl, JSON.stringify(postData));
        //results_notifier.addFinishedElement();
    },
    setup: function () {
        add_completion_callback(
            function (tests, harness_status) {
                var sessionId = results_notifier.getParamValue("sessionId");
                if (sessionId != null && sessionId != "") {
                    //Copy the value of "AppBaseUrl" from config file of Protractor.
                    var apiUrl = 'http://seanguo2:8080/api/results';
                    results_notifier.sendTestResults(tests, apiUrl);
                }
                var runId = results_notifier.getParamValue("runId");
                if (runId != null && !isNaN(parseInt(runId)) && parseInt(runId) > 0) {
                    //Copy the value of "SuiteTrackerUrl" from config file of Protractor.
                    var suiteTrackerUrl = 'http://seanguo2:8081/SuiteTracker/ConformanceRuns/UploadPartial/' + runId;
                    results_notifier.reportToSuiteTracker(tests, suiteTrackerUrl);
                }
                results_notifier.addFinishedElement();
            });
    }
};

results_notifier.setup();
