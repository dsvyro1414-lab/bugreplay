export default { ...{
  "testDir": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236",
  "outputDir": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/verification-attempt-2-011b6312/test-results",
  "workers": 1,
  "retries": 0,
  "fullyParallel": false,
  "forbidOnly": true,
  "timeout": 74487,
  "globalTimeout": 75487,
  "reporter": [
    [
      "json",
      {
        "outputFile": "artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/verification-attempt-2-011b6312/results.json"
      }
    ]
  ],
  "use": {
    "browserName": "chromium",
    "headless": true
  }
}, testMatch: new RegExp("^artifacts/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/repro\\.spec\\.ts$") };
