// Description:
//   Trae info desde larger.io sobre una URL definida
//
// Dependencies:
//   larger.ip API Key
//
// Configuration:
//   None
//
// Commands:
//   hubot larger [site_url]
//
// Author:
//   @jorgeepunan

const url     = 'https://api.larger.io/v1/';
const apiKey  = 'GPR2QH8O3M6F21WH12PG8E81OHPALS51';

module.exports = robot => {
  robot.respond(/larger (.*)/i, res => {

    let siteUrl = res.match[1];

    robot.http(`${url}search/key/${apiKey}?domain=${siteUrl}`).get()((error, response, body) => {

      if (!error && response.statusCode == 200) {

        let data      = JSON.parse(body);
        let alexa     = data.alexa;
        let info      = data.apps;
        let _regalos  = new Array();

        for (let i = 0; i < info.length; i++) {
          _regalos.push( ` - ${data.apps[i].name}` );
        }

        let msg = `El sitio ${data.url} utiliza las siguentes tecnologías:\n${_regalos.join('\n')}`;

        res.send( msg );

      } else {
        res.send(`:facepalm: Error: no existe ${siteUrl} (${error})`);
      }

    });
  });

}
