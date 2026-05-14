# RegAuth Feedback Knowledge Base

## Data Fixture Drift

When a Forward Auth failure mentions shared card pools, reused account state, expired PANs, token reuse, or state left behind by a previous scenario, classify it as data fixture drift before opening a product defect. The preferred remediation is deterministic setup that reserves owned credentials per scenario, plus teardown or quarantine for exhausted fixtures.

## Environment Readiness

When logs show 503 responses, connection failures, dependency health check gaps, or high latency before the authorization payload is evaluated, treat the failure as an environment readiness candidate. Preserve dependency status in CI artifacts and require a clean isolated rerun before changing assertions.

## Framework Lifecycle Fault

Failures in Karate `callonce`, `beforeFeature`, Java helper utilities, classpath resolution, or setup hooks should be isolated from product behavior. Build a minimal repro feature for the utility path, then rerun the failing authorization scenario only after lifecycle setup is stable.
