const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids look-alike confusion

function generatePnr(length = 6) {
  let pnr = '';
  for (let i = 0; i < length; i++) {
    pnr += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return pnr;
}

module.exports = { generatePnr };
