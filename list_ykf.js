const client = require('cheerio-httpcli');
const firebase = require("firebase");
const PORT = require('./consts.js');
const COMPANY = 'ykf';
const TABLE = COMPANY + '_status';
const URL = 'http://www.yaeyama.co.jp/';
const JSON_PATH = 'json/list-ykf.json';

// client.debug = true; // cheerio-httpcliのデバッグ出力切り替え

function run() {
  console.log('開始:' + COMPANY + ' 一覧');
  return new Promise(function(resolve) {
    client.fetch(URL)
      .then(function(result) {
        const $ = result.$;
        if (!$) return null;

        const sendData = {
          comment: '',
          updateTime: $('div.unkou_time_top').html().trim() // 更新日時
        }

        // 港別に取得してパース処理
        $('#unkou_bg_top > div.unkou_joukyou > div').each(function() {

          // 港名
          let portName = $(this).find('div').eq(0).text();

          // 港コード
          let portCode = getPortCode(portName);

          // ステータス取得
          const unkou_item_display_txt = $(this).find('div.unkou_item_display_in > div.unkou_item_display_txt');
          const kigou = unkou_item_display_txt.find('span').eq(0).text().trim(); // ○ , △ , ×
          const statusText = unkou_item_display_txt.text().replace(kigou, '').trim(); // ○通常運行 -> 通常運行
          const bikou = $(this).find('div.no_disp.unkou_item_display_bikou').text().trim(); //備考 あったりなかったりする
          const statusCode = getStatusCode(kigou);

          //   console.log(portName);
          //   console.log(portCode);
          //   console.log(kigou);
          //   console.log(statusText);
          //   console.log(bikou);
          //   console.log(statusCode);
          //   console.log(comment);

          // 運行情報を作成
          const port = {
            code: portCode,
            name: portName,
            comment: bikou,
            html: $(this).html().trim().replace(/\t/g, ''), // デバッグ用　後で消す
            status: {
              code: statusCode,
              text: statusText
            }
          }
          sendData[portCode] = port;
          //   console.log(portName + ' 完了');
        });
        return sendData;
      })
      .then(function(data) {
        if (!data) return;
        // console.log('DB登録開始' + ':' + COMPANY);
        return firebase.database().ref(TABLE).set(data, function() {
          // console.log('DB登録完了' + ':' + COMPANY);
        })
      })
      .catch(function(error) {
        console.log('エラー発生' + ':' + COMPANY);
        console.log(error);
      })
      .finally(function() {
        console.log('完了' + ':' + COMPANY + ' 一覧');
        resolve()
      });
  });
}

// 港名から港コードを返す
function getPortCode(portName) {
  // 港id
  if (portName === "竹富航路") {
    return PORT.TAKETOMI;
  } else if (portName === "小浜航路") {
    return PORT.KOHAMA;
  } else if (portName === "小浜－竹富航路") {
    return PORT.KOHAMA_TAKETOMI;
  } else if (portName === "黒島航路") {
    return PORT.KUROSHIMA;
  } else if (portName === "小浜－大原航路") {
    return PORT.KOHAMA_OOHARA;
  } else if (portName === "西表島大原航路") {
    return PORT.OOHARA;
  } else if (portName === "西表島上原航路") {
    return PORT.UEHARA;
  } else if (portName === "鳩間航路") {
    return PORT.HATOMA;
  }
}

// 記号から運行ステータスを判別
function getStatusCode(kigou) {
  if (kigou == '△') {
    return "cation";
  } else if (kigou == '×') {
    return "cancel";
  } else if (kigou == '○') {
    return "normal";
  } else {
    return "cation";
  }
}

module.exports = run;