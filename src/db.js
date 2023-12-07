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

// returns a new board initialized using the given parameters, but doesn't persist it in any way
// if ref is not null, it should be an existing board that is used as a reference for ID and tile
// info. The new board and ref can be different sizes - data will be pulled from the ref only for
// corresponding tiles that exist in the new board.
function _CreateBoardObject(name, w, h, ref=null)
{
    let board = {name, w, h, tiles:[]};
    if (ref)
        board.id = ref.id;
    else
        board.id = '' + (new Date().getTime());

    for (let x=0; x < w; x++) // we'll make it like the screen, X coord indexes into a column of entries
    {
        let col = [];
        for (let y=0; y < h; y++)
        {
            let tile = {};
            if (ref && x < ref.w && y < ref.h)
            {
                let refTile = ref.tiles[x][y];
                tile.type = refTile.type;
                tile.light = refTile.light;
                tile.movement = refTile.movement;
                tile.units = [...refTile.units]; // TODO: should probably make a deep copy
            }
            else
            {
                tile.type = 'empty';
                tile.light = 'normal';
                tile.movement = '';
                tile.units = [];
            }
            col.push(tile);
        }
        board.tiles.push(col);
    }
    return board;
}

// returns a Promise that resolves to a new board with these properties:
// .id, .name, .w / .h (board size, in tiles)
// .tiles[w][h] individual tiles, objects with these properties:
//   .type, .light
export function CreateBoard(name, w, h)
{
    return new Promise(resolve =>
    {
        let board = _CreateBoardObject(name, w, h);

        // update the boards list
        let boards = _getBoardList();
        boards = [{id:board.id, name:board.name}, ...boards];
        _setBoardList(boards);

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
    delete localStorage['board_'+id];
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
                let tileCopy = {type:tile.type, light:tile.light, movement:tile.movement, units:tile.units};
                colCopy.push(tileCopy);
            }
            boardCopy.tiles.push(colCopy);
        }

        // now jsonify and write it out
        localStorage.setItem('board_'+board.id, JSON.stringify(boardCopy));
        resolve();
    });
}

// adjusts the size of the given board to be the new dimensions, then saves it. Returns a promise that resolves
// to the resized board as if it had just been loaded (meaning, any app-specific temp tile attributes are lost),
// so the caller should then treat the board as if it had just been loaded.
export function ResizeBoard(board, newW, newH)
{
    return new Promise(resolve =>
    {
        let newBoard = _CreateBoardObject(board.name, newW, newH, board); // pass in existing board as the source reference for the new one
        SaveBoard(newBoard).then(() => resolve(newBoard));
    });
}
