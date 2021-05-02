import * as auth from "./auth";
import * as crud from "./crud";
import * as dto from "./dto";

const TOP_LIMIT = 50;

export async function handle(params: any): Promise<dto.GamePreviewWithUserDetails[]> {
    const countRowsAndColumnsParam = params.countRowsAndColumns;
    const numberCountRowsAndColumns = Number(countRowsAndColumnsParam);
    if (isNaN(numberCountRowsAndColumns) || !dto.isCountRowsAndColumnsValid(numberCountRowsAndColumns)) {
        return Promise.reject(Error("current countRowsAndColumns = ${countRowsAndColumnsParam} is invalid"));
    } else {
        const selectedGamePreviewWithUserIds: dto.GamePreviewWithUserId[] = await crud.getBestGamesByTotalSum(TOP_LIMIT, numberCountRowsAndColumns);
        const selectedUsersIds: string[] = selectedGamePreviewWithUserIds.map((gamePreviewWithUserId) => gamePreviewWithUserId.userId);

        const selectedUsers: dto.User[] = await auth.getAllUsersByIds(selectedUsersIds);

        return selectedGamePreviewWithUserIds.map((gamePreviewWithUserId) => {

            const userForGame: dto.User = (selectedUsers.find((user) => user.uid === gamePreviewWithUserId.userId) as dto.User);

            return new dto.GamePreviewWithUserDetails(
                gamePreviewWithUserId.gamePreview,
                userForGame.nickname
            );
        });
    }
}