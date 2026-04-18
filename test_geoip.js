const geoip = require('geoip-lite');
const ip = '207.97.227.239';
try {
  const geo = geoip.lookup(ip);
  console.log('GeoIP lookup successful:', geo);
} catch (e) {
  console.error('GeoIP lookup failed:', e);
}

