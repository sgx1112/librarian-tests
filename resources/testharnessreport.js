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
                var isLocalHost = url.toLowerCase().indexOf("http://localhost:2913/") == 0;
                if (!isLocalHost) // Do not inlcude credentials, when use request default localhost.
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
    translateStatus: function (testStatus, reportToSuiteTracker) {
        var Test = {
            statuses: {
                PASS: 0,
                FAIL: 1,
                TIMEOUT: 2,
                NOTRUN: 3
            }
        };

        var apiTestStatuses = {
            Unknown: reportToSuiteTracker ? "unknwn" : 0,
            Failed: reportToSuiteTracker ? "fail" : 1,
            Passed: reportToSuiteTracker ? "pass" : 2,
            ManualCheckNeeded: reportToSuiteTracker ? "check" : 3,
            Timeout: reportToSuiteTracker ? "timeout" : 4,
            NotRun: reportToSuiteTracker ? "notrun" : 5
        };

        var statusTranslation = {};
        statusTranslation[Test.statuses.PASS] = apiTestStatuses.Passed;
        statusTranslation[Test.statuses.FAIL] = apiTestStatuses.Failed;
        statusTranslation[Test.statuses.TIMEOUT] = apiTestStatuses.Timeout;
        statusTranslation[Test.statuses.NOTRUN] = apiTestStatuses.NotRun;

        return statusTranslation[testStatus];
    },
    sendTestResults: function (tests, apiUrl) {
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
            testResult.Status = results_notifier.translateStatus(test.status, false);
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
            test.result = results_notifier.translateStatus(tests[i].status, true);
            test.message = tests[i].message == null ? "" : tests[i].message.replace(/\"/g, "'");
            testGroup.tests.push(test);
        }

        var testFileResults = new Array();
        testFileResults.push(testGroup);

        var jsonResult = JSON.stringify(testFileResults);
        var postData = { results: jsonResult };

        results_notifier.ajaxPost(suiteTrackerUrl, JSON.stringify(postData));
    },
    setup: function () {
        add_completion_callback(
            function (tests, harness_status) {
                var sessionId = results_notifier.getParamValue("sessionId");
                if (sessionId != null && sessionId != "") {
                    //Keep the value of "AppBaseUrl" from config file of Protractor same with the host here.
                    var apiUrl = 'http://seanguo1:8080/api/results';
                    results_notifier.sendTestResults(tests, apiUrl);
                }
                var runId = results_notifier.getParamValue("runId");
                if (runId != null && !isNaN(parseInt(runId)) && parseInt(runId) > 0) {
                    //Copy the value of "SuiteTrackerUrl" from config file of Protractor.
                    var suiteTrackerUrl = 'http://seanguo1:8081/SuiteTracker/ConformanceRuns/UploadPartial/' + runId;
                    results_notifier.reportToSuiteTracker(tests, suiteTrackerUrl);
                }
                results_notifier.addFinishedElement();
            });
    }
};

results_notifier.setup();
