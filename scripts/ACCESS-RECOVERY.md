# Live access recovery

Observed on October 11, 2026. These are access checks, not a real investigation or P0 acceptance. No IAM or organization policies were changed. The approved gateway key is stored only in ignored server-side `.env` with mode 0600.

## LLM: use the approved LiteLLM gateway

The owner confirmed that Bedrock is prohibited by the hackathon rules. Do not request IAM/SCP changes or make further Bedrock calls for this event. The prior administrator-policy request is superseded by the supplied OpenAI-compatible LiteLLM route:

```dotenv
LLM_PROVIDER=openai
OPENAI_BASE_URL=https://litellm.vision.aivar.app/v1
OPENAI_API_KEY=<set privately in .env>
MODEL=claude-sonnet-4.6
```

The existing nonblank `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` variables take precedence over their corresponding aliases. Avoid mixing old provider values with the new gateway settings. The OpenAI SDK appends `/chat/completions`; keep `/v1` as the base URL. `npm run smoke:llm` passed through the production client with the exact expected tool decision, one request, 133 input tokens, and 20 output tokens. Safe evidence: `artifacts/tooling/llm-smoke-1791742067478.json`. This access check does not run a browser investigation.

The client continues to require valid JSON, and the investigation validates its tool-decision schema before acting. Bare `json_object` is not a verified strict JSON-schema guarantee for an Anthropic-backed proxy route. No provider change should relax these checks. Sources: [LiteLLM Anthropic parameters](https://docs.litellm.ai/docs/providers/anthropic), [official adapter](https://github.com/BerriAI/litellm/blob/main/litellm/llms/anthropic/chat/transformation.py), [proxy Chat Completions examples](https://docs.litellm.ai/docs/proxy/user_keys).

Historical AWS diagnostics are retained locally under ignored `artifacts/tooling/aws-*.json`. They establish the earlier denied calls, not a route to use for the event. The preliminary availability entries in `aws-readonly-diagnosis-20261011T151958Z.json` had a diagnostic URI-signing error and were superseded by `aws-availability-diagnosis-1791732128797.json`. Do not publish the preliminary file or its account authorization-detail references.

## Neatlogs: recovered through an alternate trusted network

Latest recheck during the LiteLLM switch: the current connection again fails hosted Doctor (`FLUSH_TIMEOUT`, `BACKEND_CONNECTION_FAILED`) and verified TLS to both official ingest endpoints (`ERR_SSL_WRONG_VERSION_NUMBER`). Documentation TLS still passes. Evidence: `artifacts/tooling/neatlogs-preflight-1791741998629-32d1f44c.json`, `artifacts/tooling/neatlogs-network-diagnostic-2026-10-11T18-06-47-864Z.json`. Reconnect the verified working network and repeat Doctor before real investigation. The successful earlier comparison follows.

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

Use the LiteLLM configuration above and run `npm run smoke:llm`. Keep credentials in server-only `.env`; never use `VITE_` variables or publish an unreviewed transcript containing keys. The local `.env` also contains the previously supplied Neatlogs project key so normal startup needs no credential-file override.

Agent B must push the real `apps/demo-shop` and `apps/web` implementation to `agent-b-product`. On October 11, that remote branch still contained only planning; no shop listened on 4173/4174. A integrates the branch and starts the buggy shop, corrected control, runner, and UI. Only after hosted Doctor and model smoke both pass can `npm run test:acceptance` and `npm run eval` establish real discovery and unchanged control replay. No substitute shop or mock result is accepted as that evidence.
