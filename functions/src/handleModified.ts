import * as crud from "./crud";
import * as dto from "./dto";
import * as utils from "./utils";
import * as mapping from "./mapping";

abstract class BaseModifiedRequest {
    protected constructor(public localId: number) {
    }
}

class ModifiedRequestCreate extends BaseModifiedRequest {
    constructor(
        localId: number,
        public createdId: string,
        public lastLocalModifiedTimestamp: number,
        public baseGameInfo: dto.BaseGameInfo
    ) {
        super(localId);
    }
}

class ModifiedRequestUpdate extends BaseModifiedRequest {
    constructor(
        localId: number,
        public id: string,
        public lastActionId: string,
        public lastLocalModifiedTimestamp: number,
        public baseGameInfo: dto.BaseGameInfo
    ) {
        super(localId);
    }
}

class ModifiedRequestDelete extends BaseModifiedRequest {
    constructor(
        localId: number,
        public id: string,
        public lastActionId: string
    ) {
        super(localId);
    }
}

abstract class BaseModifiedResponse {
    protected constructor(public localId: number, public action: dto.Action | null) {
    }
}

abstract class ModifiedResponseCreated extends BaseModifiedResponse {
    protected constructor(localId: number) {
        super(localId, dto.Action.CREATE);
    }
}

class ModifiedResponseUpdated extends BaseModifiedResponse {
    constructor(
        localId: number,
        public id: string,
        public lastActionId: string,
        public createdTimestamp: number,
        public lastSyncedTimestamp: number,
    ) {
        super(localId, dto.Action.UPDATE);
    }
}

abstract class ModifiedResponseDeleted extends BaseModifiedResponse {
    protected constructor(localId: number) {
        super(localId, dto.Action.DELETE);
    }
}

class ModifiedResponseFailed extends BaseModifiedResponse {
    constructor(localId: number, public reason: any) {
        super(localId, null);
    }
}

class ModifiedResponseCreatedSuccess extends ModifiedResponseCreated {
    constructor(
        localId: number,
        public id: string,
        public lastActionId: string,
        public createdTimestamp: number,
        public lastSyncedTimestamp: number,
    ) {
        super(localId);
    }
}

class ModifiedResponseCreatedWasChanged extends ModifiedResponseCreated {
    constructor(localId: number, public game: dto.Game) {
        super(localId);
    }
}

class ModifiedResponseDeletedSuccess extends ModifiedResponseDeleted {
    constructor(localId: number) {
        super(localId);
    }
}

class ModifiedResponseDeletedWasChanged extends ModifiedResponseDeleted {
    constructor(localId: number, public game: dto.Game) {
        super(localId);
    }
}

export function handle(userUid: string, body: any): Promise<BaseModifiedResponse[]> {
    const handlePromises: Promise<BaseModifiedResponse>[] = body.map((anyValue: any) => {
        const action: dto.Action = anyValue.type;
        const localId: number = anyValue.localId;

        switch (action) {
            case dto.Action.CREATE: {
                return handleCreated(userUid, new ModifiedRequestCreate(
                    localId,
                    anyValue.createdId,
                    anyValue.lastLocalModifiedTimestamp,
                    mapping.mapAnyToBaseGameInfo(anyValue.baseGameInfo)
                ))
                    .catch((reason) => new ModifiedResponseFailed(localId, reason));
            }
            case dto.Action.UPDATE: {
                return handleUpdated(userUid, new ModifiedRequestUpdate(
                    localId,
                    anyValue.id,
                    anyValue.lastActionId,
                    anyValue.lastLocalModifiedTimestamp,
                    mapping.mapAnyToBaseGameInfo(anyValue.baseGameInfo)
                ))
                    .catch((reason) => new ModifiedResponseFailed(localId, reason));
            }
            case dto.Action.DELETE: {
                return handleDeleted(userUid, new ModifiedRequestDelete(localId, anyValue.id, anyValue.lastActionId))
                    .catch((reason) => new ModifiedResponseFailed(localId, reason));
            }
        }
    });

    return Promise.all(handlePromises);
}

async function handleCreated(userUid: string, request: ModifiedRequestCreate): Promise<ModifiedResponseCreated> {
    const gameInDb = await crud.getGameWhereCreatedIdEqual(userUid, request.createdId);

    if (gameInDb === null) {
        return handleCreatedFirstTime(userUid, request);
    } else if (gameInDb.isEqualByBaseGameInfo(request.baseGameInfo)) {
        // request failed, was not changed by any user
        return handleCreatedAgainNotUpdated(gameInDb, request);
    } else if (!gameInDb.isEqualByBaseGameInfo(request.baseGameInfo)
        && gameInDb.generateGameHash() !== request.createdId
        && request.baseGameInfo.generateGameHash() === request.createdId) {
        // request failed, was changed just by another users one or more times, not original creator
        return handleCreatedAgainUpdatedNotByCreator(gameInDb, request);
    } else if (!gameInDb.isEqualByBaseGameInfo(request.baseGameInfo)
        && gameInDb.generateGameHash() === request.createdId
        && request.baseGameInfo.generateGameHash() !== request.createdId) {
        // request failed, was changed just by original creator, not by another users
        return handleCreatedAgainUpdatedExactlyByCreator(userUid, gameInDb, request);
    } else {
        // request failed, was changed by original creator and by another users one or more times
        return handleCreatedAgainUpdatedEverywhere(userUid, gameInDb, request);
    }
}

async function handleUpdated(userUid: string, request: ModifiedRequestUpdate): Promise<ModifiedResponseUpdated> {
    const gameInDb = await crud.getGameFor(userUid, request.id);

    if (gameInDb === null) {
        // was deleted by another user
        return handleUpdatedNoSuchGame(userUid, request);
    } else if (gameInDb.lastActionId === request.lastActionId) {
        // there is such game, was last synched with used, and was not modified after
        return handleUpdatedSynced(userUid, gameInDb, request);
    } else if (gameInDb.lastActionId !== request.lastActionId
        && gameInDb.isEqualByBaseGameInfo(request.baseGameInfo)) {
        // request failed, was not changed by any user
        return handleUpdatedWasFailOnPreviousRequest(gameInDb, request);
    } else {
        // 1) request failed, was changed by another users one or more times
        // 2) request failed, was changed by current updating user locally
        // 3) request failed, was changed by another users one or more times and by current updating user locally
        // 4) request was successfull, but was changed by another users one or more times and by current updating user locally
        // lastActionId != && baseGameInfo !=
        return handleUpdatedUnknownState(userUid, request);
    }
}

async function handleDeleted(userUid: string, request: ModifiedRequestDelete): Promise<ModifiedResponseDeleted> {
    const gameInDb = await crud.getGameFor(userUid, request.id);

    if (gameInDb === null) {
        // was no such game, or already deleted
        return handleDeletedNoSuchGame(request);
    } else if (gameInDb.lastActionId === request.lastActionId) {
        // there is such game, was last synched with used, and was not modified after
        return handleDeletedSynced(userUid, request);
    } else {
        // there is such game, was last synched with used, and was modified after by another users one or more times (lastActionId != )
        return handleDeletedWasModifiedAfterUserLastSync(gameInDb, request);
    }
}

async function handleCreatedFirstTime(userUid: string, request: ModifiedRequestCreate): Promise<ModifiedResponseCreatedSuccess> {
    const createdAndLastSyncedTimestamp = Date.now();

    const newGame: dto.Game = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        "",
        utils.generateUUID(),
        createdAndLastSyncedTimestamp,
        createdAndLastSyncedTimestamp,
        request.lastLocalModifiedTimestamp,
        request.createdId
    );

    const newGameUid: string = await crud.addNewGameForUser(userUid, newGame);

    return new ModifiedResponseCreatedSuccess(
        request.localId,
        newGameUid,
        newGame.lastActionId,
        newGame.createdTimestamp,
        newGame.lastSyncedTimestamp
    );
}

function handleCreatedAgainNotUpdated(gameInBd: dto.Game, request: ModifiedRequestCreate): Promise<ModifiedResponseCreatedSuccess> {
    const nowTimestamp = Date.now();

    return Promise.resolve(new ModifiedResponseCreatedSuccess(
        request.localId,
        gameInBd.uid,
        gameInBd.lastActionId,
        gameInBd.createdTimestamp,
        nowTimestamp
    ));
}

function handleCreatedAgainUpdatedNotByCreator(gameInDb: dto.Game, request: ModifiedRequestCreate): Promise<ModifiedResponseCreatedWasChanged> {
    return Promise.resolve(new ModifiedResponseCreatedWasChanged(
        request.localId,
        gameInDb.createCopyWithNowLastSyncedTimestamp()
    ));
}

async function handleCreatedAgainUpdatedExactlyByCreator(
    userUid: string,
    gameInDb: dto.Game,
    request: ModifiedRequestCreate
): Promise<ModifiedResponseCreatedSuccess> {
    const newGame = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        gameInDb.uid,
        utils.generateUUID(),
        gameInDb.createdTimestamp,
        Date.now(),
        request.lastLocalModifiedTimestamp,
        request.createdId
    );

    await crud.updateGameForUser(userUid, newGame);

    return new ModifiedResponseCreatedSuccess(
        request.localId,
        newGame.uid,
        newGame.lastActionId,
        newGame.createdTimestamp,
        newGame.lastSyncedTimestamp
    );
}

async function handleCreatedAgainUpdatedEverywhere(
    userUid: string,
    gameInDb: dto.Game,
    request: ModifiedRequestCreate
): Promise<ModifiedResponseCreatedSuccess> {
    const newGame = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        gameInDb.uid,
        gameInDb.lastActionId,
        gameInDb.createdTimestamp,
        gameInDb.lastSyncedTimestamp,
        gameInDb.lastLocalModifiedTimestamp,
        null
    );

    await crud.updateGameForUser(userUid, newGame);

    return handleCreatedFirstTime(userUid, request);
}

async function handleUpdatedNoSuchGame(userUid: string, request: ModifiedRequestUpdate): Promise<ModifiedResponseUpdated> {
    const createdAndLastSyncedTimestamp = Date.now();

    const newGame = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        request.id,
        utils.generateUUID(),
        createdAndLastSyncedTimestamp,
        createdAndLastSyncedTimestamp,
        request.lastLocalModifiedTimestamp,
        null
    );

    await crud.updateGameForUser(userUid, newGame);

    return new ModifiedResponseUpdated(
        request.localId,
        newGame.uid,
        newGame.lastActionId,
        newGame.createdTimestamp,
        newGame.lastSyncedTimestamp
    );
}

async function handleUpdatedSynced(userUid: string, gameInDb: dto.Game, request: ModifiedRequestUpdate): Promise<ModifiedResponseUpdated> {
    const updatedGame = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        request.id,
        utils.generateUUID(),
        gameInDb.createdTimestamp,
        Date.now(),
        request.lastLocalModifiedTimestamp,
        gameInDb.createdId
    );

    await crud.updateGameForUser(userUid, updatedGame);

    return new ModifiedResponseUpdated(
        request.localId,
        updatedGame.uid,
        updatedGame.lastActionId,
        updatedGame.createdTimestamp,
        updatedGame.lastSyncedTimestamp
    );
}

function handleUpdatedWasFailOnPreviousRequest(gameInDb: dto.Game, request: ModifiedRequestUpdate): Promise<ModifiedResponseUpdated> {
    return Promise.resolve(new ModifiedResponseUpdated(
        request.localId,
        gameInDb.uid,
        gameInDb.lastActionId,
        gameInDb.createdTimestamp,
        Date.now()
    ));
}

async function handleUpdatedUnknownState(userUid: string, request: ModifiedRequestUpdate): Promise<ModifiedResponseUpdated> {
    const createdAndLastSyncedTimestamp = Date.now();

    const newGame: dto.Game = dto.Game.fromBaseGameInfo(
        request.baseGameInfo,
        "",
        utils.generateUUID(),
        createdAndLastSyncedTimestamp,
        createdAndLastSyncedTimestamp,
        request.lastLocalModifiedTimestamp,
        null
    );

    const newGameUid: string = await crud.addNewGameForUser(userUid, newGame);

    return new ModifiedResponseUpdated(request.localId, newGameUid, newGame.lastActionId, newGame.createdTimestamp, newGame.lastSyncedTimestamp);
}

function handleDeletedNoSuchGame(request: ModifiedRequestDelete): Promise<ModifiedResponseDeletedSuccess> {
    return Promise.resolve(new ModifiedResponseDeletedSuccess(request.localId));
}

async function handleDeletedSynced(userUid: string, request: ModifiedRequestDelete): Promise<ModifiedResponseDeletedSuccess> {
    await crud.deleteGameForUser(userUid, request.id);
    return handleDeletedNoSuchGame(request);
}

function handleDeletedWasModifiedAfterUserLastSync(gameInDb: dto.Game, request: ModifiedRequestDelete): Promise<ModifiedResponseDeletedWasChanged> {
    return Promise.resolve(new ModifiedResponseDeletedWasChanged(
        request.localId,
        gameInDb.createCopyWithNowLastSyncedTimestamp()
    ));
}