/// getText.js
const path = require("path");

let globalLanguage = require("./ar.js"); //=========long=======\\


function getText(head, key, ...args) {
  let langObj = globalLanguage;

  //======by anter=======\\
  if (typeof head === "object") {
    if (head.lang && head.head) {
      try {
        langObj = require(path.resolve(__dirname, `${head.lang}.js`));
        head = head.head;
      } catch (e) {
        return `Can't load language file: "${head.lang}.js"`;
      }
    } else {
      return `Invalid language object passed to getText()`;
    }
  }

  
  if (!langObj[head]?.[key]) {
    return `Can't find text: "${head}.${key}"`;
  }

  let text = langObj[head][key];

  
  for (let i = args.length - 1; i >= 0; i--) {
    text = text.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
  }

  return text;
}

module.exports = getText;
