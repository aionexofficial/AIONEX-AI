# PROJECT AION migration 012

Migration `012_project_aion.sql` is additive. It preserves all reward users, timed mining history, tasks, referrals, wallet identities, point ledgers, automation tables, and delivery records.

Existing users receive a completed default AION profile so the cinematic onboarding does not unexpectedly block established accounts. New users receive an incomplete profile from the AION state service and complete onboarding once.

Rollback guidance: disable AION entry points and set `aion_earning_paused` to `1`. Keep the new tables as immutable audit/history data. Do not drop them in production. Application code can be rolled back independently because no existing column or contract is renamed or removed.
