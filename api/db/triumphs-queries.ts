import { ClientBase, QueryResult } from 'pg';
import { DestinyVersion } from '../shapes/general';
import { metrics } from '../metrics';

/**
 * Get all of the tracked triumphs for a particular platform_membership_id.
 */
export async function getTrackedTriumphsForProfile(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string
): Promise<number[]> {
  const results = await client.query({
    name: 'get_tracked_triumphs',
    text:
      'SELECT record_hash FROM tracked_triumphs WHERE membership_id = $1 and platform_membership_id = $2',
    values: [bungieMembershipId, platformMembershipId],
  });
  return results.rows.map((row) => row.record_hash);
}

/**
 * Get ALL of the tracked triumphs for a particular user across all platforms.
 */
export async function getAllTrackedTriumphsForUser(
  client: ClientBase,
  bungieMembershipId: number
): Promise<
  {
    platformMembershipId: string;
    destinyVersion: DestinyVersion;
    triumph: number;
  }[]
> {
  const results = await client.query({
    name: 'get_all_tracked_triumphs',
    text:
      'SELECT platform_membership_id, record_hash FROM tracked_triumphs WHERE membership_id = $1',
    values: [bungieMembershipId],
  });
  return results.rows.map((row) => ({
    platformMembershipId: row.platform_membership_id,
    destinyVersion: row.destinyVersion,
    triumph: row.record_hash,
  }));
}

/**
 * Add a tracked triumph.
 */
export async function trackTriumph(
  client: ClientBase,
  appId: string,
  bungieMembershipId: number,
  platformMembershipId: string,
  recordHash: number
): Promise<QueryResult<any>> {
  const response = await client.query({
    name: 'insert_tracked_triumph',
    text: `insert INTO tracked_triumphs (membership_id, platform_membership_id, record_hash, created_by)
values ($1, $2, $3, $4)
on conflict do nothing`,
    values: [bungieMembershipId, platformMembershipId, recordHash, appId],
  });

  if (response.rowCount < 1) {
    // This should never happen but it's OK
    metrics.increment('db.triumphs.noRowUpdated.count', 1);
  }

  return response;
}

/**
 * Remove a tracked triumph.
 */
export async function unTrackTriumph(
  client: ClientBase,
  bungieMembershipId: number,
  platformMembershipId: string,
  recordHash: number
): Promise<QueryResult<any>> {
  const response = await client.query({
    name: 'delete_tracked_triumph',
    text: `delete from tracked_triumphs where membership_id = $1 and platform_membership_id = $2 and record_hash = $3`,
    values: [bungieMembershipId, platformMembershipId, recordHash],
  });

  if (response.rowCount < 1) {
    // This should never happen but it's OK
    metrics.increment('db.triumphs.noRowDeleted.count', 1);
  }

  return response;
}

/**
 * Delete all item annotations for a user (on all platforms).
 */
export async function deleteAllTrackedTriumphs(
  client: ClientBase,
  bungieMembershipId: number
): Promise<QueryResult<any>> {
  return client.query({
    name: 'delete_all_tracked_triumphs',
    text: `delete from tracked_triumphs where membership_id = $1`,
    values: [bungieMembershipId],
  });
}
