export const UNITS = [ // available units that you can spawn - TODO: these should later come from some external source instead of being hardcoded
    // note that imageName should correspond to an imageCache key
    {name:'Archer', imageName:'unitArcher', ac:3, health:5},
    {name:'Archer Captain', imageName:'unitCapArcher', ac:4, health:8},
    {name:'Catapult', imageName:'unitCatapult', ac:2, health:10},
    {name:'Cavalry', imageName:'unitCavalry', ac:6, health:8},
    {name:'Cavalry Captain', imageName:'unitCapCavalry', ac:7, health:9},
    {name:'Spearman', imageName:'unitSpearman', ac:8, health:8},
    {name:'Spearman Captain', imageName:'unitCapSpearman', ac:8, health:10},
    {name:'Player - Melee', imageName:'unitPlayerMelee', ac:0, health:5},
    {name:'Player - Ranged', imageName:'unitPlayerRanged', ac:0, health:5},
    {name:'Player - Airborn', imageName:'unitPlayerAirborn', ac:0, health:5},
];

// called on startup to create Image objects for any assets we'll reuse. TODO: add this to one image and load as an image atlas
export let imageCache = { // name -> obj w/ attrs .url, .image (Image object)
    ttGrass:{url:'/images/tile_grass.png'},
    ttWater:{url:'/images/tile_water.jpg'},
    ttForest:{url:'/images/tile_forest.jpg'},
    ttLava:{url:'/images/tile_lava.jpg'},
    ttMtn:{url:'/images/tile_mtn.jpg'},
    ttField:{url:'/images/tile_field.jpg'},
    ttCastle:{url:'/images/tile_castle.jpg'},
    ttSand:{url:'/images/tile_sand.jpg'},
    unitArcher:{url:'/images/BasicArcher.png'},
    unitCatapult:{url:'/images/BasicCatapult.png'},
    unitCavalry:{url:'/images/BasicCavalry.png'},
    unitSpearman:{url:'/images/BasicSpearman.png'},
    unitCapArcher:{url:'/images/CaptainArcher.png'},
    unitCapCavalry:{url:'/images/CaptainCavalry.png'},
    unitCapSpearman:{url:'/images/CaptainSpearman.png'},
    unitPlayerAirborn:{url:'/images/PlayerAirborn.png'},
    unitPlayerMelee:{url:'/images/PlayerMelee.png'},
    unitPlayerRanged:{url:'/images/PlayerRanged.png'},
}; // name -> obj w/ attrs .url, .image (Image object), .loaded (t|f)

export function LoadImages()
{
    for (let [k,entry] of Object.entries(imageCache))
    {
        entry.loaded = false;
        entry.image = new Image();
        entry.image.onload = () => entry.loaded = true;
        entry.image.src = entry.url;
    }
}

