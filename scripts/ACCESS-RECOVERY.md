# Live access recovery

Observed on October 11, 2026. These are access checks, not a real investigation or P0 acceptance. Credentials were read only into process memory. No IAM or organization policies were changed.

## AWS: administrator action required

STS accepted the supplied IAM credentials. `GetUser` returned HTTP 200 with no permissions boundary. Real AWS SDK Converse requests in `us-east-1` to `openai.gpt-oss-120b-1:0` and `openai.gpt-oss-20b-1:0` both returned HTTP 403 because no identity-based policy allows `bedrock:InvokeModel`.

For those exact model resources, `SimulatePrincipalPolicy` returned `explicitDeny`, `OrganizationsDecisionDetail.AllowedByOrganizations=false`, and no missing context keys. The simulation and live denial are complementary evidence; a successful simulation alone would still require a real invocation. IAM policy enumeration was itself denied by an SCP, so the exact organizational policy statement could not be inspected.

An organization administrator must review the effective SCP hierarchy and permit the selected invocation. If an explicit Deny matches it, narrow/remove that restriction; adding another Allow cannot override it. The IAM identity also needs the following minimal policy. This file proposes a change for review; nothing has been applied.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BugReplayInvokeOneModel",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/openai.gpt-oss-120b-1:0",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "us-east-1" }
      }
    }
  ]
}
```

Non-streaming Converse requires `bedrock:InvokeModel`; our runner does not need a streaming permission, administrator access, or model-listing access. AWS documents the model's in-region support in `us-east-1`. Account availability remains unverified: a correctly signed `GetFoundationModelAvailability` request was also denied for missing permission.

Copy-paste request for the event's AWS administrator:

> BugReplay cannot use the supplied AWS participant credentials for Bedrock inference. STS succeeds, but non-streaming Converse for openai.gpt-oss-120b-1:0 in us-east-1 returns AccessDeniedException: no identity-based policy allows bedrock:InvokeModel. IAM SimulatePrincipalPolicy for that exact model also returns explicitDeny and AllowedByOrganizations=false, with no missing context keys. Please adjust the effective organization SCP restriction and grant the participant identity the single-model policy above. Alternatively, provide an approved model/region/role that permits non-streaming Converse. We can retest immediately; please do not send secret keys in a public channel.

Safe local evidence, deliberately ignored by Git:

- `artifacts/tooling/aws-direct-converse-diagnosis-1791731995631.json`
- `artifacts/tooling/aws-policy-simulation-20261011T152105Z.json`
- `artifacts/tooling/aws-availability-diagnosis-1791732128797.json`

The preliminary availability entries in `aws-readonly-diagnosis-20261011T151958Z.json` had a diagnostic URI-signing error. They do not establish availability or permission; the separate corrected availability artifact supersedes them. Do not publish the preliminary file, which also contains account authorization-detail references.

Sources: [Converse permission](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html), [Organizations simulation detail](https://docs.aws.amazon.com/IAM/latest/APIReference/API_OrganizationsDecisionDetail.html), [SCP evaluation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html), [model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-oss-120b.html).

## Neatlogs: recovered through an alternate trusted network

After the owner switched to a personal hotspot, Node 24 verified TLS 1.3 and the certificates for both official ingest endpoints. The real hosted Doctor also passed, with finalized write/readback verified for trace `d8fc1cf3a0726f795610b560d6516746` using the existing key and default US endpoint. No key, endpoint, SDK, or TLS verification setting was changed. This proves the supplied key works for that hosted Doctor path; it does not establish a real investigation or validate the key against the EU endpoint.

Successful evidence: `artifacts/tooling/neatlogs-network-diagnostic-2026-10-11T15-30-43-284Z.json` and `artifacts/tooling/neatlogs-preflight-1791732645530-74087d6b.json`. The first command exited 0; the authenticated preflight exited 0 with `finalizedReadbackVerified=true`.

On the original network, installed SDK `neatlogs@1.1.28` passed local Doctor but hosted Doctor failed with `FLUSH_TIMEOUT` and `BACKEND_CONNECTION_FAILED`.

Both documented ingest endpoints fail verified TLS in Node 24, OpenSSL, curl, and a fresh Chrome tab (`ERR_SSL_PROTOCOL_ERROR`). System, public, and authoritative DNS answers agree. TLS 1.2 and 1.3 both fail. No explicit proxy or active listed VPN was found. A later `systemextensionsctl list` check found an enabled, active third-party network filter. The owner disabled it; macOS then reported `activated disabled` (still marked active). Repeated Node 24 TLS checks and authenticated Doctor failed identically. This change did not restore access; the filter's involvement remains unproven. The agent changed no system setting.

The failure follows the ingest SNI hostname even on a known-good documentation IP; documentation SNI on that same IP negotiates verified TLS. Diagnostic ClientHello requests to the ingest addresses received 300 bytes of `0xff`, rather than a TLS record. This strongly suggests hostname-specific interception/filtering or routing along this network path. It does not identify the responsible intermediary and does not prove a global Neatlogs outage. These transport checks send no API key; they cannot establish key validity or region.

Continue on the verified working network. The original network path remains unresolved; the before/after results support network-path involvement without identifying a particular router, provider, or filter. If the original path must be repaired:

1. Give the original network operator the credential-free `npm run doctor:network` before/after reports and ask them to investigate the two official ingest hostnames. The owner already paused the observed host filter; that alone did not restore TLS. Its macOS state stayed `activated disabled` during the successful hotspot test. Restore its original setting after the comparison and repeat the check if needed; success with the filter re-enabled has not been tested. A different trusted machine can further isolate host filtering. A TLS pass alone proves transport only.
2. Confirm the project's region in the Neatlogs dashboard. Use its documented US endpoint `https://ingest.neatlogs.com` or EU endpoint `https://eu.ingest.neatlogs.com`; do not infer region from the key format.
3. Once TLS works, run the authenticated probe using the private env file. A finalized hosted readback must pass before any real investigation:

   ```sh
   BUGREPLAY_ENV_FILE=/absolute/path/to/private.env npm run doctor:neatlogs
   ```

4. If the original path still fails, send the safe transport artifacts and the following historical diagnostic request to the network operator. Neatlogs support is a fallback if the failure also occurs on independently trusted paths; there is no current evidence of a global service outage. No message has been sent automatically.

> BugReplay's neatlogs@1.1.28 local Doctor passes. On the original network, hosted Doctor fails with FLUSH_TIMEOUT and BACKEND_CONNECTION_FAILED; both documented ingest hostnames fail verified TLS 1.2/1.3 in Node 24, OpenSSL, curl, and Chrome, while docs.neatlogs.com succeeds. DNS agrees across resolvers. The error follows ingest SNI even against a known-good docs IP; raw ClientHello receives 300 bytes of 0xff. Temporarily disabling a host network filter did not fix it. Switching to a personal hotspot with that same disabled state restored verified TLS and finalized authenticated Doctor readback, using the same key/default US endpoint. Please investigate hostname-specific filtering/routing on the original network. TLS verification was never bypassed. Sanitized before/after transport evidence is available; no credentials are included.

Detailed local transport evidence: `artifacts/tooling/neatlogs-tls-diagnostic-20261011T152110Z.json`. Before/after filter comparison: `neatlogs-network-diagnostic-2026-10-11T15-25-49-560Z.json` and `neatlogs-network-diagnostic-2026-10-11T15-27-02-205Z.json` under `artifacts/tooling/`. Hosted probe after the owner's change: `artifacts/tooling/neatlogs-preflight-1791732422403-3dab04cb.json`. Fresh `doctor:network` results are saved separately.

Sources: [official endpoints](https://docs.neatlogs.com/sdk/typescript), [Doctor/readback requirements](https://docs.neatlogs.com/sdk/doctor), [project region selection](https://docs.neatlogs.com/docs/quickstart/wizard).

## Resume the actual workflow

With working AWS access, configure `LLM_PROVIDER=bedrock`, `LLM_MODEL=openai.gpt-oss-120b-1:0`, `AWS_REGION=us-east-1`, and server-only AWS credentials through the normal credential chain. Keep keys out of terminal command text, Git, and public support requests. Then run `npm run smoke:llm`. This checks model/JSON access only.

Agent B must push the real `apps/demo-shop` and `apps/web` implementation to `agent-b-product`. On October 11, that remote branch still contained only planning; no shop listened on 4173/4174. A integrates the branch and starts the buggy shop, corrected control, runner, and UI. Only after hosted Doctor and model smoke both pass can `npm run test:acceptance` and `npm run eval` establish real discovery and unchanged control replay. No substitute shop or mock result is accepted as that evidence.
