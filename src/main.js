const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const console = require("console");
const { layersOrder, format, rarity } = require("./config.js");

const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext("2d");

if (!process.env.PWD) {
  process.env.PWD = process.cwd();
}

const buildDir = `${process.env.PWD}/build`;
const metDataFile = '_metadata.json';
const layersDir = `${process.env.PWD}/layers`;

let metadata = [];
let attributes = [];
let hash = [];
let decodedHash = [];
const Exists = new Map();


const addRarity = _str => {             // defines the rarity of the image
  let itemRarity;

  rarity.forEach((r) => {               // loop through the rarity options
    if (_str.includes(r.key)) {         // and if rarity on file name exists
      itemRarity = r.val;               // read / return the rarity option
    }
  });

  return itemRarity;
};

const cleanName = _str => {             // removes rarity from the file
  let name = _str.slice(0, -4);   
  rarity.forEach((r) => {               // loop through rarity options and 
    name = name.replace(r.key, "");     // remove the rarity flag
  });
  return name;
};

const getElements = path => {
  return fs
    .readdirSync(path)                  // read through build path
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))   // filter for specific item
    .map((i, index) => {                // loop through files
      return {                          // if found file, return
        id: index + 1,                  // index of file 
        name: cleanName(i),             // clean the name (remove rarity value)
        fileName: i,                    // provide filename for uploading
        rarity: addRarity(i),           // add the rarity value
      };
    });
};

const layersSetup = layersOrder => {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    name: layerObj.name,
    location: `${layersDir}/${layerObj.name}/`,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    position: { x: 0, y: 0 },
    size: { width: format.width, height: format.height },
    number: layerObj.number
  }));

  return layers;
};

const buildSetup = () => {
  if (fs.existsSync(buildDir)) {                      // check if folder exists
    fs.rmdirSync(buildDir, { recursive: true });      // remove directory
  }
  fs.mkdirSync(buildDir);                             // create the build directory
};

const saveLayer = (_canvas, _edition) => {
  fs.writeFileSync(`${buildDir}/${_edition}.png`, _canvas.toBuffer("image/png"));
};

const addMetadata = _edition => {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: _edition,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
};

const addAttributes = (_element, _layer) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer, _edition) => {
  const rand = Math.random();           // create the random number
  
  // create an element with the random number exists pass null
  let element =
    _layer.elements[Math.floor(rand * _layer.number)] ? _layer.elements[Math.floor(rand * _layer.number)] : null;
  if (element) {                        // if element exists
    addAttributes(element, _layer);     // add element details to attribute, hash and decoded hash
    const image = await loadImage(`${_layer.location}${element.fileName}`);   // load image

    ctx.drawImage(          // draw the image with selected layer
      image,
      _layer.position.x,
      _layer.position.y,
      _layer.size.width,
      _layer.size.height
    );
    saveLayer(canvas, _edition);    // save the layer to the file
  }
};

const createFiles = async edition => {
  const layers = layersSetup(layersOrder);  // create the layers with all options  

  let numDupes = 0;
  for (let i = 1; i <= edition; i++) {      // run until 50 editions
    await layers.forEach(async (layer) => { // loop through all layers
      await drawLayer(layer, i);            // and add layer each time and save
    });

    let key = hash.toString();              // create unique key
    if (Exists.has(key)) {                  // check if duplicate exists
      console.log(
        `Duplicate creation for edition ${i}. Same as edition ${Exists.get(
          key
        )}`
      );
      numDupes++;
      if (numDupes > edition) break;        // prevents infinite loop if no more unique items can be created
      i--;
    } else {
      Exists.set(key, i);                   // add key to existins set
      addMetadata(i);                       // add metadata for the specific image
      console.log("Creating edition " + i); 
    }
  }
};

const createMetaData = () => {
  fs.stat(`${buildDir}/${metDataFile}`, (err) => {
    if(err == null || err.code === 'ENOENT') {
      fs.writeFileSync(`${buildDir}/${metDataFile}`, JSON.stringify(metadata, null, 2));
    } else {
        console.log('Oh no, error: ', err.code);
    }
  });
};

module.exports = { buildSetup, createFiles, createMetaData };
