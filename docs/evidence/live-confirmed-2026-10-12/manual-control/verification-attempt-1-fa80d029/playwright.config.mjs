export default { ...{
  "testDir": "artifacts/manual-control-2026-10-12/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236",
  "outputDir": "artifacts/manual-control-2026-10-12/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/verification-attempt-1-fa80d029/test-results",
  "workers": 1,
  "retries": 0,
  "fullyParallel": false,
  "forbidOnly": true,
  "timeout": 118500,
  "globalTimeout": 119500,
  "reporter": [
    [
      "json",
      {
        "outputFile": "artifacts/manual-control-2026-10-12/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/verification-attempt-1-fa80d029/results.json"
      }
    ]
  ],
  "use": {
    "browserName": "chromium",
    "headless": true
  }
}, testMatch: new RegExp("^artifacts/manual-control-2026-10-12/b8ffd757-6aed-405d-b7ac-ed3b1c4d9236/repro\\.spec\\.ts$") };
