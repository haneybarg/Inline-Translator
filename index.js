var querystring = require('querystring');

var TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot("548678871:AAE-BCSOW7z4c38ps8MpttJDhhKsGskZSDA", { polling: true });

var got = require('got');
var safeEval = require('safe-eval');
var token = require('google-translate-token');

var languages = require('./languages');

function translate(text, opts) {
    opts = opts || {};

    var e;
    [opts.from, opts.to].forEach(function (lang) {
        if (lang && !languages.isSupported(lang)) {
            e = new Error();
            e.code = 400;
            e.message = 'The language \'' + lang + '\' is not supported';
        }
    });
    if (e) {
        return new Promise(function (resolve, reject) {
            reject(e);
        });
    }

    opts.from = opts.from || 'auto';
    opts.to = opts.to || 'en';

    opts.from = languages.getCode(opts.from);
    opts.to = languages.getCode(opts.to);

    return token.get(text).then(function (token) {
        var url = 'https://translate.google.com/translate_a/single';
        var data = {
            client: 't',
            sl: opts.from,
            tl: opts.to,
            hl: opts.to,
            dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
            ie: 'UTF-8',
            oe: 'UTF-8',
            otf: 1,
            ssel: 0,
            tsel: 0,
            kc: 7,
            q: text
        };
        data[token.name] = token.value;

        return url + '?' + querystring.stringify(data);
    }).then(function (url) {
        return got(url).then(function (res) {
            var result = {
                text: '',
                from: {
                    language: {
                        didYouMean: false,
                        iso: ''
                    },
                    text: {
                        autoCorrected: false,
                        value: '',
                        didYouMean: false
                    }
                },
                raw: ''
            };

            if (opts.raw) {
                result.raw = res.body;
            }

            var body = safeEval(res.body);
            body[0].forEach(function (obj) {
                if (obj[0]) {
                    result.text += obj[0];
                }
            });

            if (body[2] === body[8][0][0]) {
                result.from.language.iso = body[2];
            } else {
                result.from.language.didYouMean = true;
                result.from.language.iso = body[8][0][0];
            }

            if (body[7] && body[7][0]) {
                var str = body[7][0];

                str = str.replace(/<b><i>/g, '[');
                str = str.replace(/<\/i><\/b>/g, ']');

                result.from.text.value = str;

                if (body[7][5] === true) {
                    result.from.text.autoCorrected = true;
                } else {
                    result.from.text.didYouMean = true;
                }
            }

            return result;
        }).catch(function (err) {
            var e;
            e = new Error();
            if (err.statusCode !== undefined && err.statusCode !== 200) {
                e.code = 'BAD_REQUEST';
            } else {
                e.code = 'BAD_NETWORK';
            }
            throw e;
        });
    });
}
/// ///
var cont = 1;
telegram.onText(/\/start/, (msg) => {
    
    telegram.sendMessage(msg.chat.id, "Welcome. This bot will help you translate any language to english. Type anything to start");
    cont = 0;
    
});

module.exports = translate;
module.exports.languages = languages;
//////////////////////////////////////////////////////////
const translate_a = require('google-translate-api');
var rl = require('readline');
process.stdin.setEncoding('utf8');


telegram.on("text", (message) => {
      if (cont == 0){
          telegram.sendMessage(message.chat.id,
                            "What do you want to translate?");
        cont = 1;}
         if (message !== null) {
              telegram.on("text", (messagem) => {
                  count = 1;
                  
                  translate(messagem.text, {to: 'en'}).then(res => {
                      // telegram.sendMessage(message.chat.id, res.text);
                     if(count == 1){
                      telegram.sendMessage(messagem.chat.id, res.text);
                          count++;
                          console.log(res.text);
                          //=> I speak English
                          console.log(res.from.language.iso);
                          res.text = null;
                      }
                    //=> nl
                  }).catch(err => {
                      console.error(err);
                      process.exit();                
                  });
              })     
          }
      });
 telegram.on("inline_query", (query) => { // inline part
     translate(query.query, {to: 'en'}).then(res => {
          count = 1;
          telegram.sendMessage(query.id, res.text);
          if(count == 1){
             count++;
              console.log(res.text);
              console.log(res.from.language.iso);
              telegram.answerInlineQuery(query.id, [
                  {
                      type: "article",
                      id: "testarticle",
                      title: res.text,
                      input_message_content: {
                          message_text: res.text
                     }
                  }
              ]);
              res.text = null;
          }
     }) .catch(err => {
          console.error(err);
          process.exit();                
      });
});


