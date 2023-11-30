// database abstraction - for now just loads/stores stuff locally in window.localStorage
// APIs are all promise-based in anticipation of eventually storing this in a remote DB

function _getBoardList()
{
    let boards = localStorage.getItem('boardList');
    if (boards == null)
        boards = '[]';
    return JSON.parse(boards);
}

function _setBoardList(boards)
{
    localStorage.setItem('boardList', JSON.stringify(boards));
}

// returns a Promise that resolves to a list of boards (in decreasing order of creation date). Each
// entry in the list is an object whose properties include: .id, .name
export function ListBoards()
{
    return new Promise(resolve =>
    {
        resolve(_getBoardList());
    });
}

// returns a Promise that resolves to a new board with these properties:
// .id, .name, .w / .h (board size, in tiles)
// .tiles[w][h] individual tiles, objects with these properties:
//   .type, .light
export function CreateBoard(name, w, h)
{
    return new Promise(resolve =>
    {
        let board = {name, w, h, id:'' + (new Date().getTime()), tiles:[]};

        // update the boards list
        let boards = _getBoardList();
        boards = [{id:board.id, name:board.name}, ...boards];
        _setBoardList(boards);

        for (let x=0; x < w; x++) // we'll make it like the screen, X coord indexes into a column of entries
        {
            let col = [];
            for (let y=0; y < h; y++)
            {
                let tile = {};
                tile.type = 'empty';
                tile.light = 'normal';
                tile.units = [];
                col.push(tile);
            }
            board.tiles.push(col);
        }
        SaveBoard(board);
        resolve(board);
    });
}

// loads a board as identified by ListBoards and returns it in the same format as CreateBoard (returns a promise)
export function LoadBoard(id)
{
    return new Promise(resolve =>
    {
        let board = localStorage.getItem('board_'+id);
        board = JSON.parse(board);
        resolve(board);
    });
}

export function DeleteBoard(id)
{
    let boards = _getBoardList();
    boards = boards.filter(b => b.id != id);
    _setBoardList(boards);
    return new Promise(resolve => resolve());
}

// super inefficient API for persisting a board after it has been modified.
export function SaveBoard(board)
{
    return new Promise(resolve =>
    {
        // make a copy of the board so we can strip out stuff that has been added, then persist the copy
        let boardCopy = {id:board.id, name:board.name, w:board.w, h:board.h, tiles:[]};
        for (let x=0; x < board.w; x++)
        {
            let colCopy = [];
            for (let y=0; y < board.h; y++)
            {
                let tile = board.tiles[x][y];
                let tileCopy = {type:tile.type, light:tile.light, units:tile.units};
                colCopy.push(tileCopy);
            }
            boardCopy.tiles.push(colCopy);
        }

        // now jsonify and write it out
        localStorage.setItem('board_'+board.id, JSON.stringify(boardCopy));
        resolve();
    });
}

