# Native retry01

Initial sandbox execution created a fresh cluster but loopback connect failed EACCES before CREATE DATABASE/migrations/tests. Initial receipt, logs and inert test source are preserved. Host ended the owned process; subsequent pg_ctl status confirmed no server, owned PID absent and no listener. Clean shutdown was not proven for this failed attempt.

Retry uses fresh .codex-tmp/p04r03-qualification-20261104-r2 and stoquify_local_p04_r03_20261104_r2; exact43tests unchanged other than target/evidence names. No fixture reset. Installed runner must be executed with reviewed loopback-capable sandbox escalation. Same isolation guard and child OS environment allowlist. Review new recipe/config/test hashes first.
