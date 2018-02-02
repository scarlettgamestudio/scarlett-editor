/**
 * This is a node specific class
 * Calling generate function will return null otherwise
 * Place inside node_modules for now
 */

const fs = require("fs");
const generateBMFont = require("msdf-bmfont-xml");

module.exports = class BMFontGenerator {
    static get BMFontOptions() {
      return {
        outputType: "json",
        distanceRange: 10,
        smartSize: true,
        pot: true,
        fontSize: 50,
        texturePadding: 8
      };
    }
  
    static generate(fontPath, callback) {
        const p = GameManager.activeProjectPath + "\\" + fontPath;

      generateBMFont(p, BMFontGenerator.BMFontOptions, (error, textures, font) => {
        if (error) throw error;
  
        textures.forEach(texture => {
          fs.writeFile(texture.filename + ".png", texture.texture, err => {
            if (err) throw err;
          });
        });
        fs.writeFile(font.filename, font.data, err => {
          if (err) throw err;
        });
  
        callback(true);
      });
    }
  }