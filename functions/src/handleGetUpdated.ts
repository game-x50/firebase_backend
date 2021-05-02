import * as dto from "./dto";
import * as crud from "./crud";

class GetUpdatedRequest {
    constructor(public id: string, public lastActionId: string) {
    }
}

enum ChangedStatus {
    NO_CHANGES = "NO_CHANGES", CHANGED = "CHANGED", DELETED = "DELETED"
}

abstract class BaseGetUpdatedResponse {
    constructor(public id: string, public status: ChangedStatus | null) {
    }
}

class GetUpdatedResponseNoChanges extends BaseGetUpdatedResponse {
    constructor(id: string, public lastSyncedTimestamp: number) {
        super(id, ChangedStatus.NO_CHANGES);
    }
}

class GetUpdatedResponseChanged extends BaseGetUpdatedResponse {
    constructor(id: string, public game: dto.Game) {
        super(id, ChangedStatus.CHANGED);
    }
}

class GetUpdatedResponseDeleted extends BaseGetUpdatedResponse {
    constructor(id: string) {
        super(id, ChangedStatus.DELETED);
    }
}

class GetUpdatedResponseFailed extends BaseGetUpdatedResponse {
    constructor(id: string, public reason: any) {
        super(id, null);
    }
}

export function handle(userUid: string, body: any): Promise<BaseGetUpdatedResponse[]> {
    const handlePromises: Promise<BaseGetUpdatedResponse>[] = body
        .map((anyValue: any) => new GetUpdatedRequest(anyValue.remoteId, anyValue.remoteActionId))
        .map((request: GetUpdatedRequest) =>
            crud.getGameFor(userUid, request.id)
                .then((gameInDb) => {
                    if (gameInDb === null) {
                        // was deleted by another user
                        return new GetUpdatedResponseDeleted(request.id);
                    } else if (gameInDb.lastActionId === request.lastActionId) {
                        // was not changed by any user
                        return new GetUpdatedResponseNoChanges(request.id, Date.now());
                    } else {
                        // was changed by another user one or more times (lastActionId != )
                        return new GetUpdatedResponseChanged(request.id, gameInDb.createCopyWithNowLastSyncedTimestamp());
                    }
                })
                .catch((reason) => new GetUpdatedResponseFailed(request.id, reason))
        );

    return Promise.all(handlePromises);
}