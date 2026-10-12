export default { ...{
  "testDir": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236",
  "outputDir": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/candidate-1/control/verification-attempt-1-f278fd40/test-results",
  "workers": 1,
  "retries": 0,
  "fullyParallel": false,
  "forbidOnly": true,
  "timeout": 110489,
  "globalTimeout": 111489,
  "reporter": [
    [
      "json",
      {
        "outputFile": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/candidate-1/control/verification-attempt-1-f278fd40/results.json"
      }
    ]
  ],
  "use": {
    "browserName": "chromium",
    "headless": true
  }
}, testMatch: new RegExp("^artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/repro\\.spec\\.ts$") };
