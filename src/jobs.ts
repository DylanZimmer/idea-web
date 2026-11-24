import type { Job, JobContext } from 'deepspace/worker'

export async function runJob(
  _job: Job,
  _ctx: JobContext,
  _env: unknown,
): Promise<void> {
  // No-op — implement background job handlers here.
}
