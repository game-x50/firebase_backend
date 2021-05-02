import * as crud from "./crud";
import * as dto from "./dto";

export function handle(userUid: string, body: any): Promise<dto.Game[]> {
    return crud.getGamesForWhereCreatedEqualOrGraterWithoutIdsOrdered(
        userUid,
        body.lastCreatedTimestamp,
        body.excludedRemoteIds,
        body.limit
    ).then((gamesInDb) => gamesInDb.map((gameInDb) => gameInDb.createCopyWithNowLastSyncedTimestamp()));
}