import { sql } from "~/db/sql";
import type { Tables } from "~/db/tables";
import * as Seasons from "~/features/mmr/core/Seasons";
import type { MainWeaponId } from "~/modules/in-game-lists/types";
import { dateToDatabaseTimestamp } from "~/utils/dates";
import { MATCHES_COUNT_NEEDED_FOR_LEADERBOARD } from "../leaderboards-constants";

const stm = sql.prepare(/* sql */ `
  with "q1" as (
    select
      "ReportedWeapon"."userId",
      "ReportedWeapon"."weaponSplId",
      count(*) as "count"
    from "ReportedWeapon"
    left join "GroupMatchMap" on "ReportedWeapon"."groupMatchMapId" = "GroupMatchMap"."id"
    left join "GroupMatch" on "GroupMatchMap"."matchId" = "GroupMatch"."id"
    where "GroupMatch"."createdAt" between @starts and @ends
    group by "ReportedWeapon"."userId", "ReportedWeapon"."weaponSplId"
    order by "count" desc
  )
  select
    "q1"."userId",
    "q1"."weaponSplId",
    "q1"."count"
  from "q1"
  group by "q1"."userId"
`);

export type SeasonPopularUsersWeapon = Record<
	Tables["User"]["id"],
	MainWeaponId
>;

export function seasonPopularUsersWeapon(
	season: number,
): SeasonPopularUsersWeapon {
	const { starts, ends } = Seasons.nthToDateRange(season);

	const rows = stm.all({
		season,
		starts: dateToDatabaseTimestamp(starts),
		ends: dateToDatabaseTimestamp(ends),
	}) as Array<{
		count: number;
		userId: Tables["User"]["id"];
		weaponSplId: MainWeaponId;
	}>;

	return Object.fromEntries(
		rows
			.filter((r) => r.count > MATCHES_COUNT_NEEDED_FOR_LEADERBOARD)
			.map((r) => [r.userId, r.weaponSplId]),
	);
}
