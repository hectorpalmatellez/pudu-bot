// Description:
//   Muestra las portadas de hoy de diversos diarios de Chile.
//
// Dependencies:
//   moment, whilst
//
// Configuration:
//   hubot portada <diario> - Muestra las portada de hoy del diario seleccionado.
//   hubot portada <lista|help> - Muestra el listado de portadas.
//
// Author:
//   @rotvulpix, @pottersys

const moment = require('moment')
const whilst = require('whilst')
// const cheerio = require('cheerio')

const endpointHxh = 'http://www.hoyxhoy.cl/endpoints/for-soy.php?action=get-latest&size=550'

const listaPortadas = () => {
  return `
  *Chile:*
    (el)? mercurio ((de)? calama|antofa(gasta)?|valpara(í|i)so|valpo)?
    (la)? estrella ((del?)? arica|iquique|loa|antofa(gasta)?|tocopilla|valpara(í|i)so|valpo|quillota|concepci(ó|o)n|chilo(é|e))
    (el)? sur
    (el)? austral ((de)? temuco|valdivia|osorno)
    (el)? llanquihue
    (el)? l(í|i)der (de san antonio)?
    (el)? diario (de)? atacama
    cr(ó|o)nica chill(á|a)n
    (hoyxhoy|hxh)( lpm)?
    (la)? segunda
    lun
    (el)? mercurio
    (la)? tercera
    (la)? cuarta
    (el)? tip(o|ó)grafo (de rancagua)?
    (el)? trabajo (de san felipe)?
  *Uruguay:*
    (el)? pa(í|i)s (uruguay|uru|uy)
  *Brasil:*
    (o)? globo
    folha
  *Colombia:*
    (el)? tiempo
    (el)? espectador
  *Mexico:*
    (el)? financiero
  *USA*
    ((the)? wall street journal)|wsj
    (the)? washington post
    usa today
  *Francia:*
    (le)? monde
  *España:*
    (el)? pa(í|i)s  (españa|es)
  *United Kingdom:*
    (the)? times
  *Italia:*
    (il)? corriere (della sera)?
  `
}

const diarios = {
  segunda: {
    url: 'http://img.kiosko.net/#DATE#/cl/cl_segunda.750.jpg',
    noSlashes: false
  },
  tipografo: {
    url: 'http://img.kiosko.net/#DATE#/cl/cl_tipografo.750.jpg',
    noSlashes: false
  },
  trabajo: {
    url: 'http://www.eltrabajo.cl/slide/eltrabajo%20(1).jpg',
    noSlashes: false
  },
  trabajosanfelipe: {
    url: 'http://www.eltrabajo.cl/slide/eltrabajo%20(1).jpg',
    noSlashes: false
  },
  lun: {
    url: 'http://img.kiosko.net/#DATE#/cl/cl_ultimas_noticias.750.jpg',
    noSlashes: false
  },
  mercurio: {
    url: 'http://img.kiosko.net/#DATE#/cl/cl_mercurio.750.jpg',
    noSlashes: false
  },
  tercera: {
    url: 'https://kiosco.latercera.com/latest-issue-cover-image?collection=lt_diario_la_tercera_6_30&nocache=#DATE#',
    noSlashes: true
  },
  cuarta: {
    url: 'https://kiosco.lacuarta.com/latest-issue-cover-image?collection=lc_diario_la_cuarta&nocache=#DATE#',
    noSlashes: true
  },
  estrellaarica: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaArica/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellaiquique: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstellaIquique/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  mercuriocalama: {
    url: 'http://edicionimpresa.soychile.cl/portadas/MercurioCalama/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellaloa: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaLoa/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellatocopilla: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaTocopilla/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  mercurioantofa: {
    url: 'http://edicionimpresa.soychile.cl/portadas/ElMercuriodeAntofagasta/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellaantofa: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaAntofagasta/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  diarioatacama: {
    url: 'http://edicionimpresa.soychile.cl/portadas/DiarioAtacama/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  mercuriovalpo: {
    url: 'http://edicionimpresa.soychile.cl/portadas/MercurioValparaiso/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellavalpo: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaValparaiso/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellaquillota: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaQuillota/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  lider: {
    url: 'http://edicionimpresa.soychile.cl/portadas/LiderSanAntonio/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  lidersanantonio: {
    url: 'http://edicionimpresa.soychile.cl/portadas/LiderSanAntonio/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  hoyxhoy: {
    url: endpointHxh,
    noSlashes: false
  },
  hoyxhoylpm: {
    url: endpointHxh,
    noSlashes: false,
    forcePortada: true
  },
  hxh: {
    url: endpointHxh,
    noSlashes: false
  },
  hxhlpm: {
    url: endpointHxh,
    noSlashes: false,
    forcePortada: true
  },
  sur: {
    url: 'http://edicionimpresa.soychile.cl/portadas/ElSur/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellaconce: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaConcepcion/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  cronicachillan: {
    url: 'http://edicionimpresa.soychile.cl/portadas/CronicaChillan/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  australtemuco: {
    url: 'http://edicionimpresa.soychile.cl/portadas/AustralTemuco/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  australlosrios: {
    url: 'http://edicionimpresa.soychile.cl/portadas/AustralValdivia/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  australvaldivia: {
    url: 'http://edicionimpresa.soychile.cl/portadas/AustralValdivia/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  australosorno: {
    url: 'http://edicionimpresa.soychile.cl/portadas/AustralOsorno/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  llanquihue: {
    url: 'http://edicionimpresa.soychile.cl/portadas/Llanquihue/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  estrellachiloe: {
    url: 'http://edicionimpresa.soychile.cl/portadas/EstrellaChiloe/01-550.jpg?fecha=#DATE#',
    noSlashes: true
  },
  globo: {
    url: 'http://img.kiosko.net/#DATE#/br/br_oglobo.750.jpg',
    noSlashes: false
  },
  folha: {
    url: 'http://img.kiosko.net/#DATE#/br/br_folha_spaulo.750.jpg',
    noSlashes: false
  },
  tiempo: {
    url: 'http://img.kiosko.net/#DATE#/co/co_eltiempo.750.jpg',
    noSlashes: false
  },
  espectador: {
    url: 'http://img.kiosko.net/#DATE#/co/co_espectador.750.jpg',
    noSlashes: false
  },
  paisuruguay: {
    url: 'http://www.elpais.com.uy/printed-home/#DATE#/portada_impresa.jpg',
    noSlashes: true
  },
  paisuru: {
    url: 'http://www.elpais.com.uy/printed-home/#DATE#/portada_impresa.jpg',
    noSlashes: true
  },
  paisuy: {
    url: 'http://www.elpais.com.uy/printed-home/#DATE#/portada_impresa.jpg',
    noSlashes: true
  },
  financiero: {
    url: 'http://img.kiosko.net/#DATE#/mx/mx_financiero.750.jpg',
    noSlashes: false
  },
  wallstreetjournal: {
    url: 'http://img.kiosko.net/#DATE#/eur/wsj.750.jpg',
    noSlashes: false
  },
  wsj: {
    url: 'http://img.kiosko.net/#DATE#/eur/wsj.750.jpg',
    noSlashes: false
  },
  washingtonpost: {
    url: 'http://img.kiosko.net/#DATE#/us/washington_post.750.jpg',
    noSlashes: false
  },
  usatoday: {
    url: 'http://img.kiosko.net/#DATE#/us/usa_today.750.jpg',
    noSlashes: false
  },
  monde: {
    url: 'http://www.lemonde.fr/journalelectronique/donnees/libre/#DATE#/QUO/img_pleinepage/1.jpg',
    noSlashes: true
  },
  pais: {
    url: 'http://img.kiosko.net/#DATE#/es/elpais.750.jpg',
    noSlashes: false
  },
  corrieredellasera: {
    url: 'http://img.kiosko.net/#DATE#/it/corriere_della_sera.750.jpg',
    noSlashes: false
  },
  corriere: {
    url: 'http://img.kiosko.net/#DATE#/it/corriere_della_sera.750.jpg',
    noSlashes: false
  },
  times: {
    url: 'http://img.kiosko.net/#DATE#/uk/the_times.750.jpg',
    noSlashes: false
  }
}

const formatDate = (date, noSlashes = false) => {
  return noSlashes ? date.format('YYYYMMDD') : date.format('YYYY/MM/DD')
}

const sendPortadaDate = (res, date) => {
  const portadaDate = moment(date).calendar(null, {
    today: '[hoy]',
    lastDay: '[de ayer]',
    lastWeek: '[del] DD/MM/YYYY',
    sameElse: '[del] DD/MM/YYYY'
  })
  // Solo se muestra la fecha de la portada si no es del dia actual
  portadaDate.indexOf('hoy a las') === -1 && res.send(`Esta portada es ${portadaDate}`)
}

const getPortada = (res, diario) => {
  let daysPast = 0
  let ready = true
  let testUrl = 'No existe portada de este diario por los últimos 5 días.'
  return whilst(
    () => ready,
    () => {
      if (daysPast > 5) {
        ready = false
        Promise.resolve()
      } else {
        const fecha = moment().subtract(daysPast, 'days')
        testUrl = diario.url.replace('#DATE#', formatDate(fecha, diario.noSlashes))
        return new Promise((resolve, reject) => {
          res.http(testUrl).timeout(2000).get()((err, response, body) => {
            if (err) return reject(err)
            switch (response.statusCode) {
              case 404:
                daysPast++
                resolve(testUrl)
                break
              case 200:
                ready = false
                if (testUrl === endpointHxh) {
                  try {
                    var jsonHxh = JSON.parse(body)
                    testUrl = jsonHxh[0].esPortadaFalsa || diario.forcePortada ? jsonHxh[3].img : jsonHxh[0].img
                    const dateFromHxh = testUrl && testUrl.split('/')[4]
                    dateFromHxh && sendPortadaDate(res, moment(dateFromHxh, 'DDMMYY').toDate())
                    resolve(testUrl)
                  } catch (err) {
                    reject(err)
                  }
                } else {
                  sendPortadaDate(res, fecha)
                  resolve(testUrl)
                }
                break
              case 302:
                ready = false
                sendPortadaDate(res, fecha)
                resolve(testUrl)
                break
              default:
                resolve()
                break
            }
          })
        })
      }
    }
  )
}

module.exports = (robot) => {
  robot.respond(/portada (.*)/i, (res) => {
    const nombre = res.match[1]
      .toLowerCase()
      .replace(/^(las |la |el |le |the |o |il )/, '')
      .replace(/( de | del | de la )/, '')
      .replace(/( )/g, '')
      .replace(/antofagasta$/, 'antofa')
      .replace(/valpara(?:í|i)so$/, 'valpo')
      .replace(/líder/, 'lider')
      .replace(/concepci(?:ó|o)n$/, 'conce')
      .replace(/crónica/, 'cronica')
      .replace(/chillán$/, 'chillan')
      .replace(/losríos$/, 'losrios')
      .replace(/chiloé$/, 'chiloe')
      .replace(/tipógrafo$/, 'tipografo')
      .replace(/rancagua$/, '')

    if (['lista', 'help'].includes(nombre)) {
      res.send(listaPortadas())
    } else if (nombre in diarios) {
      getPortada(res, diarios[nombre])
        .then((result) => {
          if (!result) return res.send('No hay portada disponible')
          res.send(result)
        })
        .catch((err) => {
          robot.emit('error', err, res, 'portadas')
        })
    } else {
      res.send('No conozco ese diario o revista :retard:')
    }
  })
}
