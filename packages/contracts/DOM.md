# Shop DOM contract v1

Agent A freezes this adapter contract before implementation. Agent B owns the shop and its hidden trigger. No trigger recipe belongs in runtime input.

- One visible `role="region" aria-label="Cart" aria-busy="false"`. During updates use `aria-busy="true"`.
- Cart rows inside it have `data-product-id="stable-product-id" data-quantity="positive integer"`. Only visible rows count. Empty cart has zero rows.
- The committed, visible delivery address has `data-checkout-address`. Its text changes only after a successful save, not while typing. Keep this node visible even before the first save.
- One visible `role="status" data-save-seq="0"` node persists. Reserve nonzero layout height when empty so Playwright can verify visibility. After a completed address save its text is `Address saved` and the sequence increments. Clear its text when editing, keep its sequence. Values are monotonic within a context.
- Controls have unique accessible role/name pairs. For duplicates use a named region/dialog/listitem. Ordinary form labels supply accessible names. Native selects expose visible option labels/values.
- Every interactive control (or nearest semantic ancestor) has `data-action`: `navigation`, `cart-add`, `cart-remove`, `cart-clear`, `checkout-edit`, `checkout-save`, or `checkout-submit`. Address-save controls use `checkout-save`. Unknown semantics cannot be confirmed.
- After saving, set cart `aria-busy=false` only when the entire update is finished. No delayed state changes after completion. Shop state is browser-local; each new context starts clean.
- Buggy port 4173 and corrected port 4174 share the exact DOM/UI; choose the variant only through process environment.

API types and Zod runtime schemas are exported by `@bugreplay/contracts`. Poll `GET /api/runs/:id` once per second; screenshot/artifact URLs are runner-relative `/api/...` paths. POST/cancel and result shapes match plan.md. A second active investigation receives 409. Mocks must be visibly labeled.
