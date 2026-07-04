-- Daily Kai chest: one claim per UTC day (gem rewards via ledger idempotency).

alter type public.gem_transaction_type add value if not exists 'daily_chest';

notify pgrst, 'reload schema';
