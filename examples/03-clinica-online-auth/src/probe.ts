/**
 * Open Clinica reminders + SearchByPhone owner enrichment.
 *
 * Run: cd examples/03-clinica-online-auth && bun --env-file=../../.env run start
 */

import { ClinicaOnlineClient, configFromEnv } from './clinica-client.ts';

async function main(): Promise<void> {
  const config = configFromEnv();
  const client = new ClinicaOnlineClient(config);

  console.log(`ClinicaOnline — ${config.baseUrl}`);
  console.log('Flow: login → branch → open reminders → SearchByPhone per phone\n');

  console.log('1–5) Authenticate and select branch…');
  const session = await client.loginAndSelectBranch();
  console.log(`   branch=${session.branchId}`);

  console.log('\n6) Open reminders (Confirmed=0) + owner lookup by phone');
  const reminders = await client.loadOpenRemindersWithOwnerDetails();
  console.log(`   ${reminders.length} open reminders\n`);

  for (const [i, r] of reminders.entries()) {
    const owner = r.ownerDetails;
    console.log(
      `   ${String(i + 1).padStart(2)}. event=${r.eventId} | ${r.patientName} | ${r.cellPhone} | due=${r.dueDate}`,
    );
    console.log(`       ${r.reminderText.slice(0, 70)}${r.reminderText.length > 70 ? '…' : ''}`);
    if (owner) {
      console.log(
        `       owner: ${owner.firstName} ${owner.lastName} | email=${owner.email || '—'} | pets=${owner.petsList || '—'}`,
      );
    } else if (r.ownerSearchHits > 0) {
      console.log(`       owner: ${r.ownerSearchHits} phone hits — no PatientID match`);
    } else if (r.cellPhone) {
      console.log('       owner: SearchByPhone returned no rows');
    } else {
      console.log('       owner: no phone on reminder row');
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
